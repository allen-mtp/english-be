import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { config } from '../config';

export interface AuthResult {
  user: IUser;
  token: string;
}

function signToken(user: IUser): string {
  return jwt.sign({ id: user._id.toString(), username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
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
      email: `${trimmedUsername.toLowerCase()}@local`,
    });

    const token = signToken(user);
    return { user, token };
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
    const token = signToken(user);
    return { user, token };
  },

  async getById(id: string): Promise<IUser | null> {
    return User.findById(id);
  },

  setAuthCookie(res: any, token: string): void {
    res.cookie(config.cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: config.cookieMaxAge,
      path: '/',
    });
  },

  clearAuthCookie(res: any): void {
    res.clearCookie(config.cookieName, { path: '/' });
  },
};
