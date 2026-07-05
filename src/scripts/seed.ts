import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { config } from '../config';
import { seedVocabularies } from './seed-vocab';
import { seedConversations } from './seed-conversations';

async function seed() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB');

    const args = process.argv.slice(2);
    const mode = args[0] || 'all';

    if (mode === 'all' || mode === 'vocab') {
      const vocabCount = parseInt(args[1]) || 300;
      await seedVocabularies(vocabCount);
    }

    if (mode === 'all' || mode === 'conversations') {
      const convCount = parseInt(args[2]) || args[1] ? parseInt(args[1]) : 30;
      await seedConversations(mode === 'all' ? 30 : convCount);
    }

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();