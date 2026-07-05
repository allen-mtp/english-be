import mongoose, { Schema, Document } from 'mongoose';

export interface IShadowingFeedbackItem {
  sentence: string;
  issue: string;
  suggestion: string;
}

export interface IShadowingLog extends Document {
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  sentenceIndex: number;
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  feedback: IShadowingFeedbackItem[];
  createdAt: Date;
}

const shadowingLogSchema = new Schema<IShadowingLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sentenceIndex: { type: Number, required: true },
  overallScore: { type: Number, required: true },
  accuracyScore: { type: Number, required: true },
  fluencyScore: { type: Number, required: true },
  feedback: [{
    sentence: String,
    issue: String,
    suggestion: String,
  }],
  createdAt: { type: Date, default: Date.now },
});

shadowingLogSchema.index({ userId: 1, createdAt: -1 });
shadowingLogSchema.index({ userId: 1, conversationId: 1 });

export const ShadowingLog = mongoose.model<IShadowingLog>('ShadowingLog', shadowingLogSchema);