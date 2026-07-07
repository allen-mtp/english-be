import mongoose, { Schema, Document } from 'mongoose';

export interface IWritingSubmission extends Document {
  userId: mongoose.Types.ObjectId;
  prompt: string;
  promptType: string;
  level: string;
  topic: string;
  userText: string;
  wordCount: number;
  feedback: {
    overallScore: number;
    grammarScore: number;
    vocabularyScore: number;
    coherenceScore: number;
    taskAchievement: number;
    corrections: Array<{ original: string; corrected: string; explanation: string }>;
    strengths: string[];
    improvements: string[];
    suggestions: string;
    bandScore?: string;
  };
  createdAt: Date;
}

const writingSubmissionSchema = new Schema<IWritingSubmission>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  prompt: { type: String, required: true },
  promptType: { type: String, required: true, maxlength: 100 },
  level: { type: String, required: true },
  topic: { type: String, required: true },
  userText: { type: String, required: true },
  wordCount: { type: Number, required: true },
  feedback: {
    overallScore: { type: Number, required: true },
    grammarScore: { type: Number, required: true },
    vocabularyScore: { type: Number, required: true },
    coherenceScore: { type: Number, required: true },
    taskAchievement: { type: Number, required: true },
    corrections: [{
      original: String,
      corrected: String,
      explanation: String,
    }],
    strengths: [String],
    improvements: [String],
    suggestions: { type: String, default: '' },
    bandScore: String,
  },
  createdAt: { type: Date, default: Date.now },
});

writingSubmissionSchema.index({ userId: 1, createdAt: -1 });

export const WritingSubmission = mongoose.model<IWritingSubmission>('WritingSubmission', writingSubmissionSchema);