import mongoose from 'mongoose';
import { config } from './index';

declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectDB(): Promise<void> {
  if (cached.conn) {
    return;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(config.mongodbUri).then((connection) => {
      console.log('MongoDB connected successfully');
      return connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
