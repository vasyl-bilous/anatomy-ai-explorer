/**
 * API contract types — COPY of `src/shared/contracts/anatomy.contract.ts`.
 *
 * Kept in sync by hand (only two endpoints, no codegen — see M0/ADR). If you
 * change the backend contract, update both. The error-envelope type below is
 * client-only (the server side gets it from `@geren32/nestjs-error-handler`).
 */

export type RegionScreen = 'body' | 'brain';

export interface Marker {
  id: string;
  /** 0–100, % of the illustration box width. */
  xPct: number;
  /** 0–100, % of the illustration box height. */
  yPct: number;
  label: string;
  color: string;
  tooltip: string;
}

export interface Region {
  id: string;
  name: string;
  /** Category badge; null for brain sub-regions. */
  category: string | null;
  screen: RegionScreen;
  /** Parent region id for brain sub-regions; null on body. */
  parentId: string | null;
  markers: Marker[];
}

/** Lifecycle of an AI-analysis job. `idle` is a client-only state. */
export type AnalysisStatus = 'idle' | 'processing' | 'completed' | 'failed';

export interface AnalysisResult {
  summary: string;
  findings: string[];
  /** 0–100. */
  confidence: number;
  /** ISO-8601. */
  completedAt: string;
}

export interface Analysis {
  id: string;
  regionId: string;
  status: Exclude<AnalysisStatus, 'idle'>;
  result: AnalysisResult | null;
}

export interface CreateAnalysisRequest {
  regionId: string;
}

/** Success envelope the API wraps every response in. The client unwraps `.data`. */
export interface ApiSuccessResponse<TData = unknown> {
  success: true;
  message?: string;
  data: TData | null;
  meta?: Record<string, unknown>;
}

/** Error envelope from the backend error handler. */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    category: 'business' | 'validation' | 'auth' | 'system';
    message: string;
    requestId?: string;
    details?: unknown;
  };
  statusCode: number;
}
