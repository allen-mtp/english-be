import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, name } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const { user, token } = await authService.register(username, password, name);
    authService.setAuthCookie(res, token);
    res.status(201).json({
      user: { id: user._id, username: user.username, name: user.name, level: user.level },
    });
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
    const { user, token } = await authService.login(username, password);
    authService.setAuthCookie(res, token);
    res.json({
      user: { id: user._id, username: user.username, name: user.name, level: user.level },
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  authService.clearAuthCookie(res);
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
  res.json({
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      level: user.level,
      streak: user.streak,
      xp: user.xp,
      totalXp: user.totalXp,
    },
  });
}
