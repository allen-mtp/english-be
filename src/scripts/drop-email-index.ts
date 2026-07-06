/**
 * Migration: drop the legacy `email_1` index from the users collection.
 * The email field was removed from the User model, but old indexes persist in MongoDB.
 * Without dropping this index, registering new users fails with E11000 (email: null dup key).
 *
 * Run with: npm run migrate:drop-email-index
 */
import mongoose from 'mongoose';
import { config } from '../config';

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongodbUri);
  console.log('Connected.');

  const db = mongoose.connection.db!;
  const indexes = await db.collection('users').indexes();
  console.log('Current indexes on users:', indexes.map(i => i.name));

  const emailIndex = indexes.find(i => i.name === 'email_1');
  if (!emailIndex) {
    console.log('No `email_1` index found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log('Found `email_1` index. Dropping...');
  await db.collection('users').dropIndex('email_1');
  console.log('`email_1` index dropped successfully.');

  // Also remove any lingering `email` field from existing users
  const result = await db.collection('users').updateMany(
    { email: { $exists: true } },
    { $unset: { email: '' } },
  );
  console.log(`Removed email field from ${result.modifiedCount} user(s).`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
