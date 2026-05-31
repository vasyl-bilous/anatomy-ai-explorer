import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type {
  Analysis,
  AnalysisResult,
} from '../../shared/contracts/anatomy.contract';
import {
  ANALYSIS_FAIL_RATE,
  ANALYSIS_MAX_DELAY_MS,
  ANALYSIS_MIN_DELAY_MS,
} from './analysis.constants';
import { RandomSource } from './random.provider';

/**
 * Simulated, in-memory AI-analysis job store.
 *
 * `create` enqueues a `processing` job and schedules (via setTimeout) a transition
 * to `completed` (rule-based mock result) or `failed` (with probability
 * `ANALYSIS_FAIL_RATE`). Clients poll `get` until a terminal status. Jobs live in
 * a Map and are lost on restart — a deliberate prototype trade-off (see ADR).
 */
@Injectable()
export class AnalysisService {
  private readonly jobs = new Map<string, Analysis>();

  constructor(private readonly random: RandomSource) {}

  create(regionId: string): Analysis {
    const id = randomUUID();
    const job: Analysis = { id, regionId, status: 'processing', result: null };
    this.jobs.set(id, job);

    const delay =
      ANALYSIS_MIN_DELAY_MS +
      this.random.next() * (ANALYSIS_MAX_DELAY_MS - ANALYSIS_MIN_DELAY_MS);

    setTimeout(() => {
      this.resolveJob(id, regionId);
    }, delay);

    return job;
  }

  get(id: string): Analysis | undefined {
    return this.jobs.get(id);
  }

  private resolveJob(id: string, regionId: string): void {
    const job = this.jobs.get(id);
    if (job?.status !== 'processing') return;

    const failed = this.random.next() < ANALYSIS_FAIL_RATE;
    this.jobs.set(id, {
      ...job,
      status: failed ? 'failed' : 'completed',
      result: failed ? null : this.buildResult(regionId),
    });
  }

  /** Rule-based mock result — confidence/findings vary by region (not hardcoded). */
  private buildResult(regionId: string): AnalysisResult {
    // Derive a stable pseudo-value from the regionId so the same region yields a
    // consistent-feeling score without being a fixed constant.
    let seed = 0;
    for (let i = 0; i < regionId.length; i++) {
      seed += regionId.charCodeAt(i);
    }
    const confidence = 70 + (seed % 30); // 70–99

    return {
      summary:
        'Potential abnormal activity detected in the selected region based on the available simulated signal.',
      findings: [
        'Increased signal intensity around the selected marker',
        'Possible correlation with neighbouring highlighted markers',
        confidence >= 85
          ? 'High confidence based on available input data'
          : 'Moderate confidence based on available input data',
      ],
      confidence,
      completedAt: new Date().toISOString(),
    };
  }
}
