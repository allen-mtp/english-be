import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthToken {
  id: string;
  username: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.[config.accessTokenCookie] || extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
      return;
    }
    const payload = jwt.verify(token, config.jwtSecret) as AuthToken;
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session', code: 'TOKEN_EXPIRED' });
  }
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return undefined;
}
