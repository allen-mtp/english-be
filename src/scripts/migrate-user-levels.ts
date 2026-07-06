import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../models/User';
import { GrammarLesson } from '../models/Grammar';

const LEVEL_MAP: Record<string, string> = {
  beginner: 'A1',
  intermediate: 'B1',
  advanced: 'C1',
};

async function migrate() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB\n');

    // 1. Users: migrate level + remove email field
    const users = await User.find({});
    let usersUpdated = 0;
    for (const user of users) {
      const update: any = { $unset: { email: '' } };
      const mapped = LEVEL_MAP[user.level as string];
      if (mapped) update.$set = { level: mapped };
      await User.updateOne({ _id: user._id }, update);
      usersUpdated++;
      console.log(`  ✓ User ${user.username}: level=${mapped || user.level}, email removed`);
    }
    console.log(`Users: ${usersUpdated}/${users.length} updated.\n`);

    // 2. Grammar lessons: remove difficulty field (deprecated)
    const grammarResult = await GrammarLesson.updateMany(
      {},
      { $unset: { difficulty: '' } }
    );
    console.log(`Grammar lessons: ${grammarResult.modifiedCount}/${grammarResult.matchedCount} cleaned (removed 'difficulty' field).\n`);

    console.log('✅ Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();

