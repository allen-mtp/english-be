import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Health endpoint', () => {
  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/unknown should return 401 (auth required before 404)', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(401);
  });

  it('GET /api/vocabularies without auth should return 401', async () => {
    const res = await request(app).get('/api/vocabularies/my');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NO_TOKEN');
  });
});
