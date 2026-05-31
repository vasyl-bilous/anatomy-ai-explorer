/**
 * Constants for the simulated analysis module.
 *
 * These are **feature constants, not config** — they tune a mock that wouldn't
 * exist in production (real analysis would use an actual model), so there's no
 * reason to expose them as env vars: that would leak a dev-only implementation
 * detail into the deployment surface and add tunability the prototype doesn't
 * need. Tests stay deterministic via an injectable RNG / fake timers, not env.
 */

import type { AnalysisJobStatus } from '../../shared/contracts/anatomy.contract';

/**
 * Runtime list of job statuses for the Swagger `enum`. `satisfies` ties it to the
 * shared `AnalysisJobStatus` type so the two can't drift.
 */
export const ANALYSIS_JOB_STATUSES = [
  'processing',
  'completed',
  'failed',
] as const satisfies readonly AnalysisJobStatus[];

/** Probability (0–1) that a simulated job ends in `failed` — exercises retry. */
export const ANALYSIS_FAIL_RATE = 0.1;

/** Lower bound of the simulated processing delay, in milliseconds. */
export const ANALYSIS_MIN_DELAY_MS = 1500;

/** Upper bound of the simulated processing delay, in milliseconds (>= min). */
export const ANALYSIS_MAX_DELAY_MS = 4000;
