import mongoose, { Schema, Document } from 'mongoose';

export interface IGrammarExercise {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface IGrammarLesson extends Document {
  title: string;
  topic: string;
  level: string;
  explanation: string;
  explanationVi: string;
  examples: Array<{ en: string; vi: string }>;
  rules: string[];
  commonMistakes: Array<{ mistake: string; correct: string; explanation: string }>;
  exercises: IGrammarExercise[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
}

const grammarLessonSchema = new Schema<IGrammarLesson>({
  title: { type: String, required: true, index: true },
  topic: { type: String, required: true, index: true },
  level: { type: String, required: true, index: true },
  explanation: { type: String, required: true },
  explanationVi: { type: String, required: true },
  examples: [{
    en: String,
    vi: String,
  }],
  rules: [String],
  commonMistakes: [{
    mistake: String,
    correct: String,
    explanation: String,
  }],
  exercises: [{
    question: String,
    options: [String],
    correctIndex: Number,
    explanation: String,
  }],
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
  createdAt: { type: Date, default: Date.now },
});

grammarLessonSchema.index({ topic: 1, level: 1 });

export const GrammarLesson = mongoose.model<IGrammarLesson>('GrammarLesson', grammarLessonSchema);

export interface IGrammarProgress extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  completed: boolean;
  exerciseScores: Array<{ question: string; correct: boolean }>;
  score: number;
  attempts: number;
  lastAttempt: Date;
  createdAt: Date;
}

const grammarProgressSchema = new Schema<IGrammarProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'GrammarLesson', required: true },
  completed: { type: Boolean, default: false },
  exerciseScores: [{
    question: String,
    correct: Boolean,
  }],
  score: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

grammarProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const GrammarProgress = mongoose.model<IGrammarProgress>('GrammarProgress', grammarProgressSchema);