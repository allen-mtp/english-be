import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  name: string;
  avatar?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  dailyGoalMinutes: number;
  dailyNewWords: number;
  streak: number;
  streakMax: number;
  xp: number;
  totalXp: number;
  lastActiveDate?: Date;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30, match: /^[a-zA-Z0-9_]+$/ },
  email: { type: String, required: false, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  name: { type: String, required: true, trim: true },
  avatar: { type: String },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  dailyGoalMinutes: { type: Number, default: 30 },
  dailyNewWords: { type: Number, default: 10 },
  streak: { type: Number, default: 0 },
  streakMax: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  totalXp: { type: Number, default: 0 },
  lastActiveDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    const { password, ...rest } = ret;
    return rest;
  },
});

export const User = mongoose.model<IUser>('User', userSchema);