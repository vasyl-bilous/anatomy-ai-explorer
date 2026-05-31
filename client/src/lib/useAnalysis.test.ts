import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Analysis } from '../types/contract';
import { ApiError } from './api';
import { __clearAnalysisCache, useAnalysis } from './useAnalysis';

// Mock the API module so the hook talks to controllable fakes.
vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    api: {
      createAnalysis: vi.fn(),
      getAnalysis: vi.fn(),
      listRegions: vi.fn(),
      getRegion: vi.fn(),
    },
  };
});

// Import the mocked api after vi.mock is hoisted.
import { api } from './api';

const mockApi = vi.mocked(api);

const processing: Analysis = {
  id: 'job-1',
  regionId: 'r1',
  status: 'processing',
  result: null,
};
const completed: Analysis = {
  id: 'job-1',
  regionId: 'r1',
  status: 'completed',
  result: {
    summary: 'done',
    findings: ['a'],
    confidence: 80,
    completedAt: '2026-05-31T00:00:00.000Z',
  },
};

describe('useAnalysis', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApi.createAnalysis.mockReset();
    mockApi.getAnalysis.mockReset();
    __clearAnalysisCache(); // result cache is module-level; reset between tests
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle', () => {
    const { result } = renderHook(() => useAnalysis('r1'));
    expect(result.current.state.status).toBe('idle');
  });

  it('goes idle → processing → completed', async () => {
    mockApi.createAnalysis.mockResolvedValue(processing);
    mockApi.getAnalysis.mockResolvedValue(completed);

    const { result } = renderHook(() => useAnalysis('r1'));

    act(() => {
      result.current.generate();
    });
    // POST resolves → processing
    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('processing');
    });

    // First poll tick (after the interval) reads `completed`.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.state.status).toBe('completed');
    if (result.current.state.status === 'completed') {
      expect(result.current.state.result.confidence).toBe(80);
    }
  });

  it('ignores a second generate() while processing (anti-double-submit)', async () => {
    mockApi.createAnalysis.mockResolvedValue(processing);
    mockApi.getAnalysis.mockResolvedValue(processing); // never terminal

    const { result } = renderHook(() => useAnalysis('r1'));

    act(() => {
      result.current.generate();
    });
    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('processing');
    });

    act(() => {
      result.current.generate(); // should be a no-op
    });

    // createAnalysis called exactly once despite two generate() calls.
    expect(mockApi.createAnalysis).toHaveBeenCalledTimes(1);
  });

  it('fails after the polling cap (timeout)', async () => {
    mockApi.createAnalysis.mockResolvedValue(processing);
    mockApi.getAnalysis.mockResolvedValue(processing); // stays processing forever

    const { result } = renderHook(() => useAnalysis('r1'));

    act(() => {
      result.current.generate();
    });
    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('processing');
    });

    // Advance past the 20-attempt cap (20 × 1500ms = 30s).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(21 * 1500);
    });

    expect(result.current.state.status).toBe('failed');
  });

  it('treats a 404 on poll as terminal failure', async () => {
    mockApi.createAnalysis.mockResolvedValue(processing);
    mockApi.getAnalysis.mockRejectedValue(new ApiError(404, null));

    const { result } = renderHook(() => useAnalysis('r1'));

    act(() => {
      result.current.generate();
    });
    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('processing');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.state.status).toBe('failed');
  });

  it('retry() from failed starts a fresh job', async () => {
    mockApi.createAnalysis.mockResolvedValue(processing);
    mockApi.getAnalysis.mockRejectedValueOnce(new ApiError(404, null));

    const { result } = renderHook(() => useAnalysis('r1'));

    act(() => {
      result.current.generate();
    });
    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('processing');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(result.current.state.status).toBe('failed');

    // Now retry → fresh POST, back to processing.
    mockApi.getAnalysis.mockResolvedValue(completed);
    act(() => {
      result.current.retry();
    });
    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('processing');
    });
    expect(mockApi.createAnalysis).toHaveBeenCalledTimes(2);
  });

  it('serves a cached result on remount without re-POSTing (optimization)', async () => {
    mockApi.createAnalysis.mockResolvedValue(processing);
    mockApi.getAnalysis.mockResolvedValue(completed);

    // First mount: run to completed (populates the cache for 'r1').
    const first = renderHook(() => useAnalysis('r1'));
    act(() => {
      first.result.current.generate();
    });
    await vi.waitFor(() => {
      expect(first.result.current.state.status).toBe('processing');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(first.result.current.state.status).toBe('completed');
    first.unmount();

    mockApi.createAnalysis.mockClear();

    // Remount for the same region: starts already completed, from cache.
    const second = renderHook(() => useAnalysis('r1'));
    expect(second.result.current.state.status).toBe('completed');
    expect(second.result.current.fromCache).toBe(true);

    // generate() is a no-op when a cached result is shown — no new POST.
    act(() => {
      second.result.current.generate();
    });
    expect(mockApi.createAnalysis).not.toHaveBeenCalled();

    // regenerate() forces a fresh run despite the cache.
    act(() => {
      second.result.current.regenerate();
    });
    await vi.waitFor(() => {
      expect(second.result.current.state.status).toBe('processing');
    });
    expect(mockApi.createAnalysis).toHaveBeenCalledTimes(1);
  });

  it('passes an AbortSignal and aborts the in-flight request on unmount', async () => {
    mockApi.createAnalysis.mockResolvedValue(processing);
    mockApi.getAnalysis.mockResolvedValue(processing);

    const { result, unmount } = renderHook(() => useAnalysis('r1'));
    act(() => {
      result.current.generate();
    });
    await vi.waitFor(() => {
      expect(result.current.state.status).toBe('processing');
    });

    // The request was made with an AbortSignal…
    const signal = mockApi.createAnalysis.mock.calls[0][1];
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);

    // …and unmounting aborts it (deliberate cancellation, not a failure).
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
