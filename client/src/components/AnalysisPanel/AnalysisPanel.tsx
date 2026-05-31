import './AnalysisPanel.css';

import type { AnalysisState } from '../../lib/useAnalysis';

interface AnalysisPanelProps {
  /** Name of the region/area being analysed, for the header copy. */
  regionName: string;
  state: AnalysisState;
  /** True when the shown completed result came from cache (no polling). */
  fromCache: boolean;
  onGenerate: () => void;
  onRetry: () => void;
  /** Force a fresh run, replacing any cached result. */
  onRegenerate: () => void;
}

/**
 * Status-driven UI for the AI-analysis flow. Renders purely from the single
 * `state.status` discriminant — no local booleans. The Generate button is
 * disabled while processing (the hook also guards against double-submit). When a
 * completed result is shown, the header button becomes "Regenerate" (a fresh run);
 * a cached result is surfaced so the user knows it wasn't recomputed.
 */
export function AnalysisPanel({
  regionName,
  state,
  fromCache,
  onGenerate,
  onRetry,
  onRegenerate,
}: AnalysisPanelProps) {
  const headerButton =
    state.status === 'completed' ? (
      <button
        type="button"
        className="analysis-panel__generate"
        onClick={onRegenerate}
      >
        Regenerate
      </button>
    ) : (
      <button
        type="button"
        className="analysis-panel__generate"
        onClick={onGenerate}
        disabled={state.status === 'processing'}
      >
        {state.status === 'idle' ? 'Generate AI Analysis' : 'Generate'}
      </button>
    );

  return (
    <section className="analysis-panel" aria-label="AI analysis">
      <header className="analysis-panel__header">
        <h3 className="analysis-panel__title">AI Analysis</h3>
        {headerButton}
      </header>

      <p className="analysis-panel__subject">
        Analyzing: <strong>{regionName}</strong>
      </p>

      {state.status === 'idle' && (
        <p className="analysis-panel__hint">
          Run a simulated AI analysis for this region.
        </p>
      )}

      {state.status === 'processing' && (
        <div className="analysis-panel__processing" role="status">
          <span className="analysis-panel__spinner" aria-hidden="true" />
          <span>Analyzing… this can take a few seconds.</span>
        </div>
      )}

      {state.status === 'completed' && (
        <div className="analysis-panel__result">
          {fromCache && (
            <p className="analysis-panel__cached">
              Showing a previously generated result. Use “Regenerate” to run
              again.
            </p>
          )}
          <p className="analysis-panel__summary">{state.result.summary}</p>

          <h4 className="analysis-panel__findings-title">Key findings</h4>
          <ul className="analysis-panel__findings">
            {state.result.findings.map((finding, i) => (
              <li key={i} className="analysis-panel__finding">
                {finding}
              </li>
            ))}
          </ul>

          <div className="analysis-panel__meta">
            <span className="analysis-panel__confidence">
              Confidence: {state.result.confidence}%
            </span>
            <span className="analysis-panel__timestamp">
              {new Date(state.result.completedAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {state.status === 'failed' && (
        <div className="analysis-panel__error" role="alert">
          <p className="analysis-panel__error-text">{state.error}</p>
          <button
            type="button"
            className="analysis-panel__retry"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}
