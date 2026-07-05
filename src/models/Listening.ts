import mongoose, { Schema, Document } from 'mongoose';

export interface IListeningQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface IListeningExercise extends Document {
  title: string;
  topic: string;
  level: string;
  type: 'dialogue' | 'monologue' | 'story' | 'news' | 'announcement' | 'interview';
  transcript: string;
  translation: string;
  audioUrl?: string;
  audioGenerated: boolean;
  duration: number;
  questions: IListeningQuestion[];
  vocabulary: Array<{ word: string; meaning: string; ipa: string }>;
  createdAt: Date;
}

const listeningExerciseSchema = new Schema<IListeningExercise>({
  title: { type: String, required: true },
  topic: { type: String, required: true, index: true },
  level: { type: String, required: true, index: true },
  type: { type: String, enum: ['dialogue', 'monologue', 'story', 'news', 'announcement', 'interview'], default: 'dialogue' },
  transcript: { type: String, required: true },
  translation: { type: String, required: true },
  audioUrl: String,
  audioGenerated: { type: Boolean, default: false },
  duration: { type: Number, default: 60 },
  questions: [{
    question: String,
    options: [String],
    correctIndex: Number,
    explanation: String,
  }],
  vocabulary: [{
    word: String,
    meaning: String,
    ipa: String,
  }],
  createdAt: { type: Date, default: Date.now },
});

listeningExerciseSchema.index({ topic: 1, level: 1 });

export const ListeningExercise = mongoose.model<IListeningExercise>('ListeningExercise', listeningExerciseSchema);

export interface IListeningProgress extends Document {
  userId: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  completed: boolean;
  score: number;
  attempts: number;
  lastAttempt: Date;
  createdAt: Date;
}

const listeningProgressSchema = new Schema<IListeningProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exerciseId: { type: Schema.Types.ObjectId, ref: 'ListeningExercise', required: true },
  completed: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

listeningProgressSchema.index({ userId: 1, exerciseId: 1 }, { unique: true });

export const ListeningProgress = mongoose.model<IListeningProgress>('ListeningProgress', listeningProgressSchema);