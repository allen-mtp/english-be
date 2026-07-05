import { User } from '../models/User';

export async function updateStreak(userId: string): Promise<{ streak: number; streakMax: number }> {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (lastActive) lastActive.setHours(0, 0, 0, 0);

  let newStreak = user.streak;

  if (!lastActive || lastActive.getTime() < yesterday.getTime()) {
    newStreak = 1;
  } else if (lastActive.getTime() === yesterday.getTime()) {
    newStreak += 1;
  } else if (lastActive.getTime() === today.getTime()) {
    // Already logged today, don't change streak
  }

  user.lastActiveDate = new Date();
  user.streak = newStreak;
  if (newStreak > user.streakMax) {
    user.streakMax = newStreak;
  }

  await user.save();
  return { streak: user.streak, streakMax: user.streakMax };
}