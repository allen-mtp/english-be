import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningLog extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  type: 'VOCABULARY' | 'PRONUNCIATION' | 'SHADOWING' | 'CONVERSATION' | 'REVIEW';
  durationMinutes: number;
  xpEarned: number;
  details: {
    vocabularyIds?: string[];
    conversationId?: string;
    score?: number;
  };
  createdAt: Date;
}

const learningLogSchema = new Schema<ILearningLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true },
  type: {
    type: String,
    enum: ['VOCABULARY', 'PRONUNCIATION', 'SHADOWING', 'CONVERSATION', 'REVIEW'],
    required: true,
  },
  durationMinutes: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  details: {
    vocabularyIds: [String],
    conversationId: String,
    score: Number,
  },
  createdAt: { type: Date, default: Date.now },
});

learningLogSchema.index({ userId: 1, date: -1 });
learningLogSchema.index({ userId: 1, type: 1, date: -1 });

export const LearningLog = mongoose.model<ILearningLog>('LearningLog', learningLogSchema);