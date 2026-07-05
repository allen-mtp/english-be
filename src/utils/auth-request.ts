import { Request } from 'express';

export function getUserId(req: Request): string {
  if (!req.user) {
    throw new Error('Not authenticated');
  }
  return req.user.id;
}
