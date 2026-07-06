import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  topic: string;
  level: string;
  dialogue: Array<{ speaker: string; text: string; translation: string }>;
  vocabularyHighlights: Array<{ word: string; meaning: string }>;
  grammarNotes: string;
  audioUrl?: string;
  audioGenerated: boolean;
  createdAt: Date;
}

const conversationSchema = new Schema<IConversation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  topic: { type: String, required: true, index: true },
  level: { type: String, required: true, index: true },
  dialogue: [{
    speaker: { type: String, required: true },
    text: { type: String, required: true },
    translation: { type: String, required: true },
  }],
  vocabularyHighlights: [{
    word: String,
    meaning: String,
  }],
  grammarNotes: { type: String, default: '' },
  audioUrl: String,
  audioGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

conversationSchema.index({ topic: 1, level: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);