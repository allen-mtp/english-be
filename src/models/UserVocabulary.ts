import mongoose, { Schema, Document } from 'mongoose';

export interface IUserVocabulary extends Document {
  userId: mongoose.Types.ObjectId;
  vocabularyId: mongoose.Types.ObjectId;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReview?: Date;
  status: 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED';
  createdAt: Date;
}

const userVocabularySchema = new Schema<IUserVocabulary>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vocabularyId: { type: Schema.Types.ObjectId, ref: 'Vocabulary', required: true },
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  repetitions: { type: Number, default: 0 },
  nextReview: { type: Date, default: Date.now, index: true },
  lastReview: { type: Date },
  status: { type: String, enum: ['NEW', 'LEARNING', 'REVIEW', 'MASTERED'], default: 'NEW' },
  createdAt: { type: Date, default: Date.now },
});

userVocabularySchema.index({ userId: 1, nextReview: 1 });
userVocabularySchema.index({ userId: 1, vocabularyId: 1 }, { unique: true });

export const UserVocabulary = mongoose.model<IUserVocabulary>('UserVocabulary', userVocabularySchema);