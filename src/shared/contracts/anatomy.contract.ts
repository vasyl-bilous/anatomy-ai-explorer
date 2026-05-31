/**
 * Shared API contract for the Anatomy AI Explorer.
 *
 * Single source of truth for the shapes exchanged between the NestJS API and the
 * React client. These are hand-written (only two endpoints — no OpenAPI codegen)
 * and copied into `client/` during M4. Keep both copies in sync.
 *
 * Conventions baked in here (see also CLAUDE.md):
 * - Routes live under `/api/v1` (global prefix `api` + URI versioning, default v1).
 * - Every success response is wrapped by the envelope below; the client unwraps
 *   `.data` centrally.
 * - Marker coordinates are PERCENTAGES of their screen's illustration box
 *   (responsive), never absolute pixels. See `MARKER_REFERENCE_BOX`.
 */

/** Which illustration a region belongs to. */
export type RegionScreen = 'body' | 'brain';

/**
 * A clickable dot painted over an illustration. `xPct`/`yPct` are 0–100,
 * relative to the top-left of that screen's reference box (see below).
 */
export interface Marker {
  id: string;
  /** Horizontal position as a percentage (0–100) of the illustration box width. */
  xPct: number;
  /** Vertical position as a percentage (0–100) of the illustration box height. */
  yPct: number;
  /** Short label shown in the hover tooltip. */
  label: string;
  /** Marker fill color (hex), from the design palette. */
  color: string;
  /** Tooltip / contextual text shown on hover. */
  tooltip: string;
}

/**
 * A selectable anatomy region. On the body screen these are diseases (with a
 * category); on the brain screen they are sub-regions of the drilled-in disease.
 */
export interface Region {
  id: string;
  name: string;
  /** Category badge (e.g. "Neurological"); null for brain sub-regions. */
  category: string | null;
  screen: RegionScreen;
  /** Parent region id for brain sub-regions (e.g. Alzheimer's); null on body. */
  parentId: string | null;
  markers: Marker[];
}

/**
 * Lifecycle of an AI-analysis job. `idle` is a client-only state; the server only
 * ever reports the "job" statuses (`AnalysisJobStatus`). Runtime enum arrays (for
 * validation / Swagger) live next to their consuming module and are tied back to
 * these types via `satisfies`.
 */
export type AnalysisJobStatus = 'processing' | 'completed' | 'failed';
export type AnalysisStatus = 'idle' | AnalysisJobStatus;

/** The simulated AI-analysis payload, available once `status === 'completed'`. */
export interface AnalysisResult {
  summary: string;
  findings: string[];
  /** Confidence score 0–100 (rule-based, varies by region — not hardcoded). */
  confidence: number;
  /** ISO-8601 timestamp of when the analysis completed. */
  completedAt: string;
}

/** Shape returned by `POST /api/v1/analyses` and `GET /api/v1/analyses/:id`. */
export interface Analysis {
  id: string;
  regionId: string;
  status: AnalysisJobStatus;
  /** Present only when `status === 'completed'`. */
  result: AnalysisResult | null;
}

/** Request body for `POST /api/v1/analyses`. */
export interface CreateAnalysisRequest {
  regionId: string;
}

/**
 * Success envelope applied by `SuccessResponseInterceptor` to every controller
 * return. The client reads `.data`. This is the canonical definition — it's a
 * front/back contract, so it lives in `shared/`; `common/dto` re-exports it for
 * the NestJS side.
 */
export interface ApiSuccessResponse<TData = unknown> {
  success: true;
  message?: string;
  data: TData | null;
  meta?: Record<string, unknown>;
}
