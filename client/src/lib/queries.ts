import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { RegionScreen } from '../types/contract';
import { api } from './api';

/** Query keys — centralized so prefetch and invalidation stay consistent. */
export const queryKeys = {
  regions: (screen?: RegionScreen) => ['regions', screen ?? 'all'] as const,
  region: (id: string) => ['region', id] as const,
};

export function useRegions(screen?: RegionScreen) {
  return useQuery({
    queryKey: queryKeys.regions(screen),
    queryFn: () => api.listRegions(screen),
  });
}

export function useRegion(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.region(id ?? ''),
    queryFn: () => api.getRegion(id as string),
    enabled: Boolean(id),
  });
}

/**
 * Hover-prefetch a region's detail (M6 "Next level"): warms the cache so entering
 * the drill-down screen is instant. Region detail only — never the analysis.
 */
export function useRegionPrefetch() {
  const client = useQueryClient();
  return (id: string) =>
    client.prefetchQuery({
      queryKey: queryKeys.region(id),
      queryFn: () => api.getRegion(id),
    });
}
