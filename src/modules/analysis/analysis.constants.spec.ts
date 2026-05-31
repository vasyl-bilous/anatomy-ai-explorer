import {
  ANALYSIS_FAIL_RATE,
  ANALYSIS_MAX_DELAY_MS,
  ANALYSIS_MIN_DELAY_MS,
} from './analysis.constants';

describe('analysis constants', () => {
  it('keeps the fail rate within 0–1', () => {
    expect(ANALYSIS_FAIL_RATE).toBeGreaterThanOrEqual(0);
    expect(ANALYSIS_FAIL_RATE).toBeLessThanOrEqual(1);
  });

  it('keeps the delay window non-negative and ordered (max >= min)', () => {
    expect(ANALYSIS_MIN_DELAY_MS).toBeGreaterThanOrEqual(0);
    expect(ANALYSIS_MAX_DELAY_MS).toBeGreaterThanOrEqual(ANALYSIS_MIN_DELAY_MS);
  });
});
