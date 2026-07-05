export function calculateXP(type: string, quality?: number, streak?: number): number {
  switch (type) {
    case 'NEW_WORD':
      return 10;
    case 'REVIEW_WORD':
      return quality !== undefined && quality >= 3 ? 3 : 1;
    case 'PRONUNCIATION':
      return 20;
    case 'SHADOWING':
      return 20;
    case 'DAILY_LESSON':
      return 50 + (streak || 0) * 5;
    case 'GRAMMAR_EXERCISE':
      // quality is score/20 so it maps to 0-5
      return 15 + (quality !== undefined ? Math.round(quality * 3) : 0);
    case 'WRITING':
      return 25 + (quality !== undefined ? Math.round(quality * 5) : 0);
    case 'LISTENING':
      return 15 + (quality !== undefined ? Math.round(quality * 3) : 0);
    case 'QUIZ':
      return 30 + (quality !== undefined ? Math.round(quality * 5) : 0);
    case 'ROLEPLAY':
      return 30;
    default:
      return 0;
  }
}