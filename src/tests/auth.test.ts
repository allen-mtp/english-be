import request from 'supertest';
import { createApp } from '../app';
import { User } from '../models/User';
import { config } from '../config';

const app = createApp();

function getCookies(res: request.Response): string[] {
  const header = res.headers['set-cookie'];
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

function getAccessCookie(res: request.Response): string {
  return getCookies(res).find(c => c.startsWith(`${config.accessTokenCookie}=`))?.split(';')[0] || '';
}

function getRefreshCookie(res: request.Response): string {
  return getCookies(res).find(c => c.startsWith(`${config.refreshTokenCookie}=`))?.split(';')[0] || '';
}

async function registerUser(username: string, password = 'Password123') {
  return request(app).post('/api/auth/register').send({ username, password, name: 'Test User' });
}

describe('Auth: register', () => {
  it('should register a new user with 201', async () => {
    const res = await registerUser('newuser1');
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('newuser1');
    expect(res.body.user.name).toBe('Test User');
    expect(res.body.user.level).toBe('A1');
    expect(res.body.user.password).toBeUndefined();
    expect(getAccessCookie(res)).toBeTruthy();
    expect(getRefreshCookie(res)).toBeTruthy();
  });

  it('should reject duplicate username with 409', async () => {
    await registerUser('dupuser');
    const res = await registerUser('dupuser');
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already taken');
  });

  it('should reject missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'onlyuser' });
    expect(res.status).toBe(400);
  });

  it('should reject short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'shortpw', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('6 characters');
  });

  it('should reject short username', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'ab', password: 'Password123' });
    expect(res.status).toBe(400);
  });
});

describe('Auth: login', () => {
  beforeEach(async () => {
    await registerUser('loginuser', 'MyPass123');
  });

  it('should login with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'loginuser', password: 'MyPass123' });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('loginuser');
    expect(getAccessCookie(res)).toBeTruthy();
  });

  it('should reject wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'loginuser', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('should reject unknown user with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'ghost', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('should be case-insensitive for username', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'LOGINUSER', password: 'MyPass123' });
    expect(res.status).toBe(200);
  });
});

describe('Auth: /me', () => {
  it('should return current user with valid token', async () => {
    const reg = await registerUser('meuser');
    const res = await request(app).get('/api/auth/me').set('Cookie', getAccessCookie(reg));
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('meuser');
  });

  it('should reject without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should reject with invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', `${config.accessTokenCookie}=invalidtoken`);
    expect(res.status).toBe(401);
  });
});

describe('Auth: logout', () => {
  it('should clear cookies on logout', async () => {
    const reg = await registerUser('logoutuser');
    const res = await request(app).post('/api/auth/logout').set('Cookie', getAccessCookie(reg));
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
    const cookies = getCookies(res);
    expect(cookies.some(c => c.includes('token=;'))).toBe(true);
  });
});

describe('Auth: refresh', () => {
  it('should issue new tokens with valid refresh token', async () => {
    const reg = await registerUser('refreshuser');
    const res = await request(app).post('/api/auth/refresh').set('Cookie', getRefreshCookie(reg));
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('refreshuser');
    expect(getAccessCookie(res)).toBeTruthy();
  });

  it('should reject without refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NO_REFRESH_TOKEN');
  });

  it('should revoke refresh token hash after rotation (reuse detection)', async () => {
    const reg = await registerUser('reuseuser');
    const refreshCookie = getRefreshCookie(reg);

    const first = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(first.status).toBe(200);

    const second = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(second.status).toBe(401);
    expect(second.body.code).toBe('REFRESH_FAILED');
  });
});

describe('Auth: User model defaults', () => {
  it('should default level to A1', async () => {
    await registerUser('leveluser');
    const user = await User.findOne({ username: 'leveluser' });
    expect(user?.level).toBe('A1');
  });

  it('should not have email field after registration', async () => {
    await registerUser('noemailuser');
    const user = await User.findOne({ username: 'noemailuser' }).lean() as any;
    expect(user.email).toBeUndefined();
  });

  it('should have refreshTokenHash set after login', async () => {
    await registerUser('hashtest', 'Pass1234');
    await request(app).post('/api/auth/login').send({ username: 'hashtest', password: 'Pass1234' });
    const user = await User.findOne({ username: 'hashtest' });
    expect(user?.refreshTokenHash).toBeTruthy();
  });
});
