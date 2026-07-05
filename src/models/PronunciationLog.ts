import mongoose, { Schema, Document } from 'mongoose';

export interface IPronunciationLog extends Document {
  userId: mongoose.Types.ObjectId;
  text: string;
  overallScore: number;
  wordScores: Array<{ word: string; score: number; issue?: string }>;
  feedback: string;
  issues: Array<{ type: string; description: string }>;
  createdAt: Date;
}

const pronunciationLogSchema = new Schema<IPronunciationLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true },
  overallScore: { type: Number, required: true },
  wordScores: [{
    word: String,
    score: Number,
    issue: String,
  }],
  feedback: { type: String, default: '' },
  issues: [{
    type: String,
    description: String,
  }],
  createdAt: { type: Date, default: Date.now },
});

pronunciationLogSchema.index({ userId: 1, createdAt: -1 });

export const PronunciationLog = mongoose.model<IPronunciationLog>('PronunciationLog', pronunciationLogSchema);