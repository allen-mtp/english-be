import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config';
import { connectDB } from './config/database';
import { generalLimiter, slowDownLimiter } from './middleware/rateLimiter';
import { requireAuth } from './middleware/auth';
import authRoutes from './routes/auth.routes';
import vocabularyRoutes from './routes/vocabulary.routes';
import conversationRoutes from './routes/conversation.routes';
import pronunciationRoutes from './routes/pronunciation.routes';
import shadowingRoutes from './routes/shadowing.routes';
import roadmapRoutes from './routes/roadmap.routes';
import progressRoutes from './routes/progress.routes';
import roleplayRoutes from './routes/roleplay.routes';
import grammarRoutes from './routes/grammar.routes';
import writingRoutes from './routes/writing.routes';
import listeningRoutes from './routes/listening.routes';
import quizRoutes from './routes/quiz.routes';
import speakingScenarioRoutes from './routes/speaking-scenario.routes';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

app.use(slowDownLimiter);
app.use(generalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.use('/api', requireAuth);

app.use('/api/vocabularies', vocabularyRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/pronunciation', pronunciationRoutes);
app.use('/api/shadowing', shadowingRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/roleplay', roleplayRoutes);
app.use('/api/grammar', grammarRoutes);
app.use('/api/writing', writingRoutes);
app.use('/api/listening', listeningRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/speaking-scenarios', speakingScenarioRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request entity too large' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

start();

export default app;
