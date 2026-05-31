import './ExplorerPage.css';

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppShell } from '../components/AppShell';
import { BodyIllustration } from '../components/BodyIllustration';
import { DiseaseCard } from '../components/DiseaseCard';
import { useRegionPrefetch, useRegions } from '../lib/queries';

const HOVER_INTENT_MS = 90;

/**
 * Explorer (Screen A — "Disease Navigator"). Owns the single source of truth
 * `selectedRegionId` that drives two-way highlight between the disease list and
 * the body markers. Selection never navigates; the explicit "Next level" button
 * does, and only when a region is selected.
 */
export function ExplorerPage() {
  const { data, isPending, isError, error, refetch } = useRegions('body');
  const prefetchRegion = useRegionPrefetch();
  const navigate = useNavigate();

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // Card DOM refs, keyed by region id, so a marker click can scroll its card in.
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Hover-intent timer for the "Next level" prefetch.
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Select from a card: highlight only. */
  function selectFromCard(id: string) {
    setSelectedRegionId(id);
  }

  /** Select from a marker: highlight + bring the matching card into view. */
  function selectFromMarker(id: string) {
    setSelectedRegionId(id);
    cardRefs.current[id]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }

  // Interactive elements whose click should NOT clear the selection (they either
  // set it or act on it). A click anywhere else in the Explorer deselects.
  const KEEP_SELECTION_SELECTOR =
    '.disease-card, .region-markers__marker, .explorer__next, .explorer__retry, [role="tab"]';

  /** Clicking empty space (between columns, gutters, background) deselects. */
  function handleRootClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!(e.target as HTMLElement).closest(KEEP_SELECTION_SELECTOR)) {
      setSelectedRegionId(null);
    }
  }

  function clearHoverIntent() {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }

  /** After hover-intent on the enabled button, warm the region-detail cache. */
  function handleNextHover() {
    if (selectedRegionId === null) return;
    const id = selectedRegionId;
    clearHoverIntent();
    hoverTimer.current = setTimeout(() => {
      void prefetchRegion(id);
    }, HOVER_INTENT_MS);
  }

  function handleNextClick() {
    if (selectedRegionId === null) return;
    void navigate(`/region/${selectedRegionId}`);
  }

  const regions = data ?? [];

  return (
    <AppShell>
      {/* Root click clears the selection unless an interactive element was hit. */}
      <div className="explorer" onClick={handleRootClick}>
        <section className="explorer__left">
          <h1 className="explorer__intro-title">Disease Navigator</h1>
          <p className="explorer__intro-subtitle">
            An interactive, human data–powered view of disease biology across
            systems and organs
          </p>

          <div className="explorer__tabs" role="tablist" aria-label="Browse by">
            <button
              type="button"
              role="tab"
              aria-selected="true"
              className="explorer__tab explorer__tab--active"
            >
              By disease
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="false"
              className="explorer__tab"
              disabled
            >
              By system
            </button>
          </div>

          <h2 className="explorer__section-heading">Diseases</h2>

          {isPending && (
            <p className="explorer__status" role="status">
              Loading diseases…
            </p>
          )}

          {isError && (
            <div className="explorer__error" role="alert">
              <p>Failed to load diseases: {error.message}</p>
              <button
                type="button"
                className="explorer__retry"
                onClick={() => void refetch()}
              >
                Retry
              </button>
            </div>
          )}

          {!isPending && !isError && regions.length === 0 && (
            <p className="explorer__status">No diseases found.</p>
          )}

          {regions.length > 0 && (
            <div className="explorer__list">
              {regions.map((region) => (
                <div
                  key={region.id}
                  ref={(el) => {
                    cardRefs.current[region.id] = el;
                  }}
                >
                  <DiseaseCard
                    region={region}
                    isSelected={region.id === selectedRegionId}
                    onSelect={selectFromCard}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="explorer__right">
          <div className="explorer__actions">
            <button
              type="button"
              className="explorer__next"
              disabled={selectedRegionId === null}
              onClick={handleNextClick}
              onMouseEnter={handleNextHover}
              onMouseLeave={clearHoverIntent}
              onFocus={handleNextHover}
              onBlur={clearHoverIntent}
            >
              Next level
            </button>
          </div>

          <BodyIllustration
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelect={selectFromMarker}
          />
        </section>
      </div>
    </AppShell>
  );
}
