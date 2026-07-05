export interface SRSResult {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  status: 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED';
}

export function calculateSM2(
  quality: number,
  prevEaseFactor: number = 2.5,
  prevInterval: number = 0,
  prevRepetitions: number = 0
): SRSResult {
  let newEF = prevEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newInterval: number;
  let newRepetitions: number;

  if (quality < 3) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions = prevRepetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(prevInterval * newEF);
    }
  }

  const nextReview = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);

  let status: SRSResult['status'];
  if (quality < 3) status = 'LEARNING';
  else if (newRepetitions >= 3 && newInterval >= 21) status = 'MASTERED';
  else if (newRepetitions >= 1) status = 'REVIEW';
  else status = 'LEARNING';

  return { easeFactor: newEF, interval: newInterval, repetitions: newRepetitions, nextReview, status };
}