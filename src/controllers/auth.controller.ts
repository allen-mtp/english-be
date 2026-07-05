import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/auth.service';
import { config } from '../config';

function publicUser(user: any) {
  return {
    id: user._id,
    username: user.username,
    name: user.name,
    level: user.level,
    streak: user.streak,
    xp: user.xp,
    totalXp: user.totalXp,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, name } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const { user, accessToken, refreshToken } = await authService.register(username, password, name);
    authService.setAccessTokenCookie(res, accessToken);
    authService.setRefreshTokenCookie(res, refreshToken);
    res.status(201).json({ user: publicUser(user) });
  } catch (error: any) {
    const msg = error.message || 'Registration failed';
    const status = msg.includes('already taken') ? 409 : 400;
    res.status(status).json({ error: msg });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const { user, accessToken, refreshToken } = await authService.login(username, password);
    authService.setAccessTokenCookie(res, accessToken);
    authService.setRefreshTokenCookie(res, refreshToken);
    res.json({ user: publicUser(user) });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.[config.refreshTokenCookie];
    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token', code: 'NO_REFRESH_TOKEN' });
      return;
    }
    const { user, accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
    authService.setAccessTokenCookie(res, accessToken);
    authService.setRefreshTokenCookie(res, newRefreshToken);
    res.json({ user: publicUser(user) });
  } catch (error: any) {
    authService.clearAuthCookies(res);
    res.status(401).json({ error: error.message || 'Refresh failed', code: 'REFRESH_FAILED' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.[config.refreshTokenCookie];
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, config.refreshTokenSecret) as { id: string };
        if (payload?.id) {
          await authService.revoke(payload.id);
        }
      } catch (err) {
        // token already invalid — nothing to revoke
      }
    }
  } catch (err) {
    // ignore revoke errors
  }
  authService.clearAuthCookies(res);
  res.json({ message: 'Logged out' });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = await authService.getById(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: publicUser(user) });
}
