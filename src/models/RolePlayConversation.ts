import mongoose, { Schema, Document } from 'mongoose';

export interface IRolePlayMessage {
  role: 'ai' | 'user';
  text: string;
  corrections?: string;
  grammarIssues?: Array<{ error: string; correct: string; explanation: string }>;
  vocabularyNote?: string;
  aiReply?: string;
}

export interface IRolePlayConversation extends Document {
  userId: mongoose.Types.ObjectId;
  scenario: string;
  title: string;
  aiRole: string;
  userRole: string;
  level: string;
  topic: string;
  messages: IRolePlayMessage[];
  summary: string;
  overallScore?: number;
  completedAt?: Date;
  createdAt: Date;
}

const messageSchema = new Schema<IRolePlayMessage>({
  role: { type: String, enum: ['ai', 'user'], required: true },
  text: { type: String, required: true },
  corrections: { type: String },
  grammarIssues: [{
    error: String,
    correct: String,
    explanation: String,
  }],
  vocabularyNote: { type: String },
  aiReply: { type: String },
}, { _id: false });

const rolePlayConversationSchema = new Schema<IRolePlayConversation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scenario: { type: String, required: true },
  title: { type: String, required: true },
  aiRole: { type: String, required: true },
  userRole: { type: String, required: true },
  level: { type: String, required: true },
  topic: { type: String, required: true, index: true },
  messages: { type: [messageSchema], default: [] },
  summary: { type: String, default: '' },
  overallScore: { type: Number },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

rolePlayConversationSchema.index({ userId: 1, createdAt: -1 });

export const RolePlayConversation = mongoose.model<IRolePlayConversation>('RolePlayConversation', rolePlayConversationSchema);