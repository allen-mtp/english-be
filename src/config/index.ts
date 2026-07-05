import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/english-learning',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3006',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me-in-production-please-use-long-random-string',
  jwtExpiresIn: '7d',
  cookieName: 'token',
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000,
};