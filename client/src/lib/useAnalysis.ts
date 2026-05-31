import { useCallback, useEffect, useRef, useState } from 'react';

import type { AnalysisResult } from '../types/contract';
import { api, ApiError } from './api';

/**
 * Explicit, discriminated state machine for the async AI-analysis flow.
 * A single `status` field is the source of truth — we never derive it from
 * scattered booleans (`isLoading`/`hasError`/…). The result/error payloads only
 * exist in the states where they are meaningful.
 */
export type AnalysisState =
  | { status: 'idle' }
  | { status: 'processing' }
  | { status: 'completed'; result: AnalysisResult }
  | { status: 'failed'; error: string };

/** Poll cadence and cap. 20 × 1500ms ≈ 30s before we give up (req. 4). */
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 20;

/**
 * Module-level cache of completed results, keyed by regionId. Lives outside the
 * hook so a result survives unmount/remount: returning to a region you've already
 * analysed shows the result instantly — no re-POST, no polling. `regenerate()`
 * bypasses it for a fresh run.
 */
const resultCache = new Map<string, AnalysisResult>();

/** Clear the result cache. Exposed for tests; not used by the app. */
export function __clearAnalysisCache(): void {
  resultCache.clear();
}

export interface UseAnalysis {
  state: AnalysisState;
  /**
   * Start a job: POST, then poll to terminal. No-op while processing (req. 2).
   * If this region already has a cached completed result, it's a no-op (the
   * result is already shown) — call `regenerate` to force a fresh run.
   */
  generate: () => void;
  /** From `failed`, start a fresh job (req. 8). */
  retry: () => void;
  /** Force a fresh run, ignoring (and replacing) any cached result. */
  regenerate: () => void;
  /** True when the shown result came from cache (no polling this visit). */
  fromCache: boolean;
}

/**
 * Hand-written async state machine (deliberately NOT TanStack Query — this flow
 * is the part being assessed). It owns the full lifecycle of one analysis job for
 * `regionId`.
 *
 * Concurrency model: every job run gets a monotonically increasing local "run
 * token" (`runIdRef`). Any async callback (POST resolution, each poll tick)
 * captures the token it was started under and bails the moment it no longer
 * matches the current run — this single guard covers stale jobs from a previous
 * `generate()` and post-unmount writes (requirements 5 + 6).
 *
 * Reset-on-region-change is handled by the **caller** via a React `key` (the
 * analysis subtree is mounted with `key={regionId}`), so switching regions
 * remounts the hook with a fresh initial state — the canonical React way to reset
 * all state when an identity changes, and cleaner than resetting state in an
 * effect or during render.
 */
/** Initial state for a region: a cached completed result, else idle. */
function initialState(regionId: string): AnalysisState {
  const cached = resultCache.get(regionId);
  return cached ? { status: 'completed', result: cached } : { status: 'idle' };
}

/** A fetch aborted via AbortController rejects with a DOMException named 'AbortError'. */
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export function useAnalysis(regionId: string): UseAnalysis {
  const [state, setState] = useState<AnalysisState>(() =>
    initialState(regionId),
  );
  // Whether the currently-shown result came straight from cache (no polling).
  const [fromCache, setFromCache] = useState<boolean>(() =>
    resultCache.has(regionId),
  );

  // Identifies the currently-active run. Incremented on every generate/retry and
  // on unmount — invalidating any in-flight callbacks (stale-job + unmount guard).
  const runIdRef = useRef(0);
  // The active poll interval, so we can clear it deterministically.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Aborts the in-flight HTTP request(s) of the current run — so a superseded run
  // or an unmount cancels the network call, not just ignores its result.
  const abortRef = useRef<AbortController | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const abortInFlight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  /** Begin a fresh run: bump the token, POST, then poll until terminal. */
  const start = useCallback(() => {
    // Invalidate anything still in flight from a previous run: stop its timer AND
    // abort its HTTP request, then open a fresh AbortController for this run.
    clearTimer();
    abortInFlight();
    runIdRef.current += 1;
    const myRun = runIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setFromCache(false);
    setState({ status: 'processing' });

    void api
      .createAnalysis({ regionId }, signal)
      .then((analysis) => {
        // Stale-job / unmount guard (req. 5 + 6): a newer run started, the
        // region changed, or we unmounted — drop this response.
        if (myRun !== runIdRef.current) return;

        // The job could already be terminal on first read (fast mock), but the
        // POST contract returns `processing`; begin polling regardless.
        const jobId = analysis.id;
        let attempts = 0;

        const poll = () => {
          attempts += 1;

          // Polling cap / timeout (req. 4): never spin forever.
          if (attempts > MAX_POLL_ATTEMPTS) {
            if (myRun !== runIdRef.current) return;
            clearTimer();
            setState({
              status: 'failed',
              error: 'Analysis timed out. Please try again.',
            });
            return;
          }

          void api
            .getAnalysis(jobId, signal)
            .then((job) => {
              // Re-check the run token inside the poll callback (req. 5): if a
              // newer job started or the region changed, this response is stale.
              if (myRun !== runIdRef.current) return;

              if (job.status === 'completed' && job.result) {
                clearTimer();
                // Cache so a later visit to this region shows it instantly.
                resultCache.set(regionId, job.result);
                setState({ status: 'completed', result: job.result });
              } else if (job.status === 'failed') {
                clearTimer();
                setState({
                  status: 'failed',
                  error: 'The analysis could not be completed.',
                });
              }
              // status === 'processing' → keep polling.
            })
            .catch((err: unknown) => {
              // Deliberate cancellation (new run / unmount) — not a failure.
              if (isAbortError(err)) return;
              if (myRun !== runIdRef.current) return;
              // Unknown id → terminal failure (req. 7): if the job is gone (404,
              // e.g. server restarted), stop polling instead of spinning.
              if (err instanceof ApiError && err.status === 404) {
                clearTimer();
                setState({
                  status: 'failed',
                  error: 'Analysis job was lost. Please try again.',
                });
                return;
              }
              // Transient network/other error: stop and surface as failed so the
              // user gets a retry path rather than an endless spinner.
              clearTimer();
              setState({
                status: 'failed',
                error:
                  err instanceof Error
                    ? err.message
                    : 'Unexpected error while fetching the analysis.',
              });
            });
        };

        // Poll on an interval until a terminal state (req. 3). First tick fires
        // after one interval — the backend needs >= 1500ms to resolve anyway.
        timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
      })
      .catch((err: unknown) => {
        // Deliberate cancellation (new run / unmount) — not a failure.
        if (isAbortError(err)) return;
        if (myRun !== runIdRef.current) return;
        setState({
          status: 'failed',
          error:
            err instanceof Error
              ? err.message
              : 'Failed to start the analysis.',
        });
      });
  }, [regionId, clearTimer, abortInFlight]);

  const generate = useCallback(() => {
    // Anti-double-submit (req. 2): ignore while a job is already running. The
    // button is also disabled, but the hook guards independently. Also a no-op
    // when a (cached) result is already shown — use `regenerate` to force one.
    if (state.status === 'processing' || state.status === 'completed') return;
    start();
  }, [state.status, start]);

  const retry = useCallback(() => {
    // From `failed`, a clean fresh job (req. 8). `start` resets to `processing`.
    start();
  }, [start]);

  const regenerate = useCallback(() => {
    // Force a fresh run even if a cached result exists: drop the cache entry,
    // then start. Guarded against double-submit while processing.
    if (state.status === 'processing') return;
    resultCache.delete(regionId);
    start();
  }, [state.status, regionId, start]);

  // On unmount (req. 6): bump the run token (so no late callback writes state),
  // stop the poll timer, and abort the in-flight request.
  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      clearTimer();
      abortInFlight();
    };
  }, [clearTimer, abortInFlight]);

  return { state, generate, retry, regenerate, fromCache };
}
