import { calculateSM2 } from '../services/srs.service';

describe('SRS service: calculateSM2', () => {
  it('should return LEARNING status for quality < 3', () => {
    const result = calculateSM2(2, 2.5, 0, 0);
    expect(result.status).toBe('LEARNING');
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
  });

  it('should increment repetitions on quality >= 3', () => {
    const result = calculateSM2(5, 2.5, 0, 0);
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.status).toBe('REVIEW');
  });

  it('should set interval=3 on second successful review', () => {
    const result = calculateSM2(5, 2.5, 1, 1);
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(3);
  });

  it('should compute interval based on easeFactor for repetitions >= 3', () => {
    const result = calculateSM2(5, 2.5, 3, 2);
    expect(result.repetitions).toBe(3);
    expect(result.interval).toBeGreaterThan(3);
  });

  it('should clamp easeFactor to minimum 1.3', () => {
    const result = calculateSM2(0, 1.4, 0, 0);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('should mark MASTERED after 3+ repetitions and 21+ day interval', () => {
    const result = calculateSM2(5, 3.0, 21, 2);
    expect(result.repetitions).toBe(3);
    expect(result.interval).toBeGreaterThanOrEqual(21);
    expect(result.status).toBe('MASTERED');
  });

  it('should reset repetitions to 0 on quality < 3', () => {
    const result = calculateSM2(2, 2.5, 10, 5);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.status).toBe('LEARNING');
  });

  it('should use defaults when prev values not provided', () => {
    const result = calculateSM2(5);
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBeGreaterThan(0);
  });

  it('should set nextReview to a future date', () => {
    const result = calculateSM2(5, 2.5, 0, 0);
    expect(result.nextReview.getTime()).toBeGreaterThan(Date.now() - 1000);
  });
});
