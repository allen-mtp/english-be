import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { config } from '../config';

export interface AuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

function signAccessToken(user: IUser): string {
  return jwt.sign({ id: user._id.toString(), username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
}

function signRefreshToken(user: IUser): string {
  return jwt.sign(
    { id: user._id.toString(), username: user.username, jti: crypto.randomUUID() },
    config.refreshTokenSecret,
    { expiresIn: config.refreshTokenExpiresIn as any },
  );
}

async function hashRefreshToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authService = {
  async register(username: string, password: string, name?: string): Promise<AuthResult> {
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new Error('Invalid input');
    }
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      throw new Error('Username must be 3-30 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const existing = await User.findOne({ username: trimmedUsername.toLowerCase() });
    if (existing) {
      throw new Error('Username already taken');
    }

    const displayName = (typeof name === 'string' ? name.trim() : '') || trimmedUsername;
    const user = await User.create({
      username: trimmedUsername.toLowerCase(),
      password,
      name: displayName,
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokenHash = await hashRefreshToken(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
  },

  async login(username: string, password: string): Promise<AuthResult> {
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new Error('Invalid input');
    }
    const trimmedUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: trimmedUsername }).select('+password');
    if (!user) {
      throw new Error('Invalid username or password');
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      throw new Error('Invalid username or password');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokenHash = await hashRefreshToken(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
  },

  async refresh(refreshToken: string): Promise<RefreshResult> {
    if (!refreshToken) {
      throw new Error('Refresh token required');
    }
    let payload: { id: string; username: string };
    try {
      payload = jwt.verify(refreshToken, config.refreshTokenSecret) as any;
    } catch (err) {
      throw new Error('Invalid or expired refresh token');
    }
    const user = await User.findById(payload.id);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.refreshTokenHash) {
      throw new Error('Session revoked');
    }
    const incomingHash = await hashRefreshToken(refreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      throw new Error('Refresh token mismatch — possible reuse detected');
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);
    user.refreshTokenHash = await hashRefreshToken(newRefreshToken);
    await user.save();

    return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  async revoke(userId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $unset: { refreshTokenHash: '' } });
  },

  async getById(id: string): Promise<IUser | null> {
    return User.findById(id);
  },

  setAccessTokenCookie(res: any, token: string): void {
    res.cookie(config.accessTokenCookie, token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: config.accessTokenMaxAge,
      path: '/',
    });
  },

  setRefreshTokenCookie(res: any, token: string): void {
    res.cookie(config.refreshTokenCookie, token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: config.refreshTokenMaxAge,
      path: '/',
    });
  },

  clearAuthCookies(res: any): void {
    res.clearCookie(config.accessTokenCookie, { path: '/', secure: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
    res.clearCookie(config.refreshTokenCookie, { path: '/', secure: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
  },
};
