import type {
  Analysis,
  ApiErrorResponse,
  ApiSuccessResponse,
  CreateAnalysisRequest,
  Region,
  RegionScreen,
} from '../types/contract';

const BASE_URL = '/api/v1';

/** Thrown for any non-2xx response; carries the parsed error envelope if present. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, body: ApiErrorResponse | null) {
    super(
      body?.error.message ?? `Request failed with status ${String(status)}`,
    );
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error.code ?? 'UNKNOWN';
    this.requestId = body?.error.requestId;
  }
}

/** Core fetch: sends/receives JSON, unwraps the success envelope's `.data`. */
async function request<TData>(
  path: string,
  init?: RequestInit,
): Promise<TData> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, body as ApiErrorResponse | null);
  }

  return (body as ApiSuccessResponse<TData>).data as TData;
}

export const api = {
  listRegions(screen?: RegionScreen): Promise<Region[]> {
    const qs = screen ? `?screen=${screen}` : '';
    return request<Region[]>(`/regions${qs}`);
  },

  getRegion(id: string): Promise<Region> {
    return request<Region>(`/regions/${id}`);
  },

  createAnalysis(
    body: CreateAnalysisRequest,
    signal?: AbortSignal,
  ): Promise<Analysis> {
    return request<Analysis>('/analyses', {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    });
  },

  getAnalysis(id: string, signal?: AbortSignal): Promise<Analysis> {
    return request<Analysis>(`/analyses/${id}`, { signal });
  },
};
