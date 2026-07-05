import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion {
  type: 'multiple-choice' | 'fill-blank' | 'true-false' | 'matching';
  category: 'vocabulary' | 'grammar' | 'listening' | 'reading';
  question: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation: string;
  difficulty: number;
}

export interface IQuiz extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  level: string;
  type: 'placement' | 'practice' | 'achievement';
  category: 'mixed' | 'vocabulary' | 'grammar' | 'listening' | 'reading';
  questions: IQuizQuestion[];
  totalQuestions: number;
  score?: number;
  correctCount?: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
  timeLimit?: number;
  createdAt: Date;
}

const quizSchema = new Schema<IQuiz>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  level: { type: String, required: true },
  type: { type: String, enum: ['placement', 'practice', 'achievement'], default: 'practice' },
  category: { type: String, enum: ['mixed', 'vocabulary', 'grammar', 'listening', 'reading'], default: 'mixed' },
  questions: [{
    type: { type: String, enum: ['multiple-choice', 'fill-blank', 'true-false', 'matching'] },
    category: { type: String, enum: ['vocabulary', 'grammar', 'listening', 'reading'] },
    question: String,
    options: [String],
    correctIndex: Number,
    correctAnswer: String,
    explanation: String,
    difficulty: { type: Number, default: 1 },
  }],
  totalQuestions: { type: Number, required: true },
  score: Number,
  correctCount: Number,
  completed: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  timeLimit: Number,
  createdAt: { type: Date, default: Date.now },
});

quizSchema.index({ userId: 1, completed: 1 });
quizSchema.index({ userId: 1, createdAt: -1 });

export const Quiz = mongoose.model<IQuiz>('Quiz', quizSchema);