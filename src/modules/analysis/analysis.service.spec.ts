import { AnalysisService } from './analysis.service';
import type { RandomSource } from './random.provider';

/** Deterministic RNG: returns queued values in order, repeating the last one. */
function stubRandom(values: number[]): RandomSource {
  let i = 0;
  return {
    next: () => values[Math.min(i++, values.length - 1)],
  };
}

describe('AnalysisService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('creates a job in "processing" with no result', () => {
    // next() #1 = delay factor; later next() = fail roll.
    const service = new AnalysisService(stubRandom([0.5, 0.9]));

    const job = service.create('region-1');

    expect(job.status).toBe('processing');
    expect(job.result).toBeNull();
    expect(service.get(job.id)).toEqual(job);
  });

  it('transitions to "completed" with a result after the delay (fail roll high)', () => {
    // delay=0.5, fail roll 0.9 >= 0.1 → completed
    const service = new AnalysisService(stubRandom([0.5, 0.9]));
    const job = service.create('region-1');

    jest.runAllTimers();

    const done = service.get(job.id);
    expect(done?.status).toBe('completed');
    expect(done?.result).not.toBeNull();
    expect(done?.result?.confidence).toBeGreaterThanOrEqual(70);
    expect(done?.result?.confidence).toBeLessThanOrEqual(99);
    expect(done?.result?.findings.length).toBeGreaterThan(0);
  });

  it('transitions to "failed" with no result when the fail roll hits', () => {
    // delay=0.5, fail roll 0.05 < 0.1 → failed
    const service = new AnalysisService(stubRandom([0.5, 0.05]));
    const job = service.create('region-1');

    jest.runAllTimers();

    const done = service.get(job.id);
    expect(done?.status).toBe('failed');
    expect(done?.result).toBeNull();
  });

  it('returns undefined for an unknown id', () => {
    const service = new AnalysisService(stubRandom([0.5]));
    expect(service.get('does-not-exist')).toBeUndefined();
  });

  it('gives different ids to separate jobs', () => {
    const service = new AnalysisService(stubRandom([0.5, 0.9]));
    const a = service.create('region-1');
    const b = service.create('region-2');
    expect(a.id).not.toBe(b.id);
  });

  it('derives a stable confidence per region', () => {
    const service = new AnalysisService(stubRandom([0.5, 0.9]));
    const job = service.create('region-stable');
    jest.runAllTimers();
    const first = service.get(job.id)?.result?.confidence;

    const job2 = service.create('region-stable');
    jest.runAllTimers();
    const second = service.get(job2.id)?.result?.confidence;

    expect(first).toBe(second);
  });
});
