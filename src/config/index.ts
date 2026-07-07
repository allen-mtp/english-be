import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3005', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/english-learning',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3006',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me-in-production-please-use-long-random-string',
  jwtExpiresIn: '15m',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change-me-in-production-please-use-long-random-string',
  refreshTokenExpiresIn: '7d',
  accessTokenCookie: 'token',
  refreshTokenCookie: 'refresh_token',
  accessTokenMaxAge: 15 * 60 * 1000,
  refreshTokenMaxAge: 7 * 24 * 60 * 60 * 1000,
};