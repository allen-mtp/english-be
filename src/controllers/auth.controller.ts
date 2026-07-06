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
  try {
    const token =
      req.cookies?.[config.accessTokenCookie] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!token) {
      res.json({ user: null });
      return;
    }

    const payload = jwt.verify(token, config.jwtSecret) as { id: string };
    const user = await authService.getById(payload.id);
    if (!user) {
      res.json({ user: null });
      return;
    }

    res.json({ user: publicUser(user) });
  } catch {
    // Expired or invalid access token — let the client refresh and retry
    res.status(401).json({ error: 'Invalid or expired session', code: 'TOKEN_EXPIRED' });
  }
}
