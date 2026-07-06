import { calculateXP } from '../services/xp.service';

describe('XP service: calculateXP', () => {
  it('NEW_WORD should return 10 XP', () => {
    expect(calculateXP('NEW_WORD')).toBe(10);
  });

  it('REVIEW_WORD should return 3 XP for quality >= 3', () => {
    expect(calculateXP('REVIEW_WORD', 3)).toBe(3);
    expect(calculateXP('REVIEW_WORD', 5)).toBe(3);
  });

  it('REVIEW_WORD should return 1 XP for quality < 3', () => {
    expect(calculateXP('REVIEW_WORD', 2)).toBe(1);
    expect(calculateXP('REVIEW_WORD', 0)).toBe(1);
  });

  it('PRONUNCIATION should return 20 XP', () => {
    expect(calculateXP('PRONUNCIATION')).toBe(20);
  });

  it('SHADOWING should return 20 XP', () => {
    expect(calculateXP('SHADOWING')).toBe(20);
  });

  it('DAILY_LESSON should add streak bonus', () => {
    expect(calculateXP('DAILY_LESSON', undefined, 0)).toBe(50);
    expect(calculateXP('DAILY_LESSON', undefined, 5)).toBe(75);
    expect(calculateXP('DAILY_LESSON', undefined, 10)).toBe(100);
  });

  it('GRAMMAR_EXERCISE should scale with quality', () => {
    expect(calculateXP('GRAMMAR_EXERCISE', 0)).toBe(15);
    expect(calculateXP('GRAMMAR_EXERCISE', 5)).toBe(30);
  });

  it('WRITING should scale with quality', () => {
    expect(calculateXP('WRITING', 0)).toBe(25);
    expect(calculateXP('WRITING', 5)).toBe(50);
  });

  it('QUIZ should scale with quality', () => {
    expect(calculateXP('QUIZ', 0)).toBe(30);
    expect(calculateXP('QUIZ', 5)).toBe(55);
  });

  it('ROLEPLAY should return 30 XP', () => {
    expect(calculateXP('ROLEPLAY')).toBe(30);
  });

  it('Unknown type should return 0 XP', () => {
    expect(calculateXP('UNKNOWN')).toBe(0);
  });
});
