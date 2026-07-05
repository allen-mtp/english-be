import mongoose, { Schema, Document } from 'mongoose';

export interface IVocabulary extends Document {
  word: string;
  ipa: string;
  meaningVi: string;
  meaningEn: string;
  partOfSpeech: string;
  examples: Array<{ en: string; vi: string }>;
  synonyms: string[];
  collocations: string[];
  level: string;
  topic: string;
  category: string;
  imageUrl?: string;
  audioUrl?: string;
  audioGenerated: boolean;
  createdAt: Date;
}

const vocabularySchema = new Schema<IVocabulary>({
  word: { type: String, required: true, index: true },
  ipa: { type: String, required: true },
  meaningVi: { type: String, required: true },
  meaningEn: { type: String, required: true },
  partOfSpeech: { type: String, required: true },
  examples: [{ en: String, vi: String }],
  synonyms: [String],
  collocations: [String],
  level: { type: String, required: true, index: true },
  topic: { type: String, required: true, index: true },
  category: { type: String, default: 'general' },
  imageUrl: String,
  audioUrl: String,
  audioGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

vocabularySchema.index({ word: 1, level: 1 });
vocabularySchema.index({ topic: 1, level: 1 });

export const Vocabulary = mongoose.model<IVocabulary>('Vocabulary', vocabularySchema);