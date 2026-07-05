import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyLessonVocab {
  word: string;
  ipa: string;
  meaningVi: string;
  meaningEn: string;
  partOfSpeech: string;
  examples: Array<{ en: string; vi: string }>;
}

export interface IDailyLesson {
  day: number;
  title: string;
  vocabularies: IDailyLessonVocab[];
  grammarNote: string;
  conversationTitle: string;
  conversation: Array<{ speaker: string; text: string; translation: string }>;
  pronunciationFocus: string;
  shadowingText: string;
  tips: string;
}

export interface IRoadmap extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  level: string;
  goal: string;
  dailyMinutes: number;
  totalDays: number;
  currentDay: number;
  lessons: IDailyLesson[];
  isActive: boolean;
  generatedBy: string;
  createdAt: Date;
}

const roadmapSchema = new Schema<IRoadmap>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  level: { type: String, required: true },
  goal: { type: String, required: true },
  dailyMinutes: { type: Number, required: true },
  totalDays: { type: Number, default: 30 },
  currentDay: { type: Number, default: 0 },
  lessons: [{
    day: { type: Number, required: true },
    title: { type: String, required: true },
    vocabularies: [{
      word: String,
      ipa: String,
      meaningVi: String,
      meaningEn: String,
      partOfSpeech: String,
      examples: [{ en: String, vi: String }],
    }],
    grammarNote: { type: String, default: '' },
    conversationTitle: { type: String, default: '' },
    conversation: [{
      speaker: String,
      text: String,
      translation: String,
    }],
    pronunciationFocus: { type: String, default: '' },
    shadowingText: { type: String, default: '' },
    tips: { type: String, default: '' },
  }],
  isActive: { type: Boolean, default: true },
  generatedBy: { type: String, default: 'ai' },
  createdAt: { type: Date, default: Date.now },
});

export const Roadmap = mongoose.model<IRoadmap>('Roadmap', roadmapSchema);