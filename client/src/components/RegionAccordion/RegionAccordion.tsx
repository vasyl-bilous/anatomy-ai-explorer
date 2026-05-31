import './RegionAccordion.css';

import type { KeyboardEvent } from 'react';
import { useEffect, useRef } from 'react';

import type { Region } from '../../types/contract';

interface RegionAccordionProps {
  regions: Region[];
  /** The single source of truth shared with the brain markers. */
  selectedRegionId: string | null;
  /** Clicking a header selects (and expands) that region; clicking the open one collapses. */
  onToggle: (regionId: string) => void;
}

/**
 * Accordion of the brain sub-regions. The expanded item IS the selected region
 * — there is no separate "open" state, so the accordion and the markers stay in
 * lock-step via the single `selectedRegionId` (two-way highlight). Headers are
 * real <button>s with aria-expanded and Enter/Space handling (native for a
 * button, plus an explicit guard for clarity).
 */
export function RegionAccordion({
  regions,
  selectedRegionId,
  onToggle,
}: RegionAccordionProps) {
  // When selection changes (e.g. from a marker click), scroll the open item in.
  const headerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    if (selectedRegionId !== null) {
      headerRefs.current[selectedRegionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedRegionId]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(id);
    }
  }

  return (
    <div className="region-accordion">
      {regions.map((region) => {
        const isOpen = region.id === selectedRegionId;
        const panelId = `accordion-panel-${region.id}`;
        const headerId = `accordion-header-${region.id}`;
        // Brain sub-regions carry their detail in the (single) marker tooltip.
        const detail = region.markers[0]?.tooltip ?? 'No additional detail.';
        return (
          <div
            key={region.id}
            className={
              'region-accordion__item' +
              (isOpen ? ' region-accordion__item--open' : '')
            }
          >
            <button
              type="button"
              id={headerId}
              ref={(el) => {
                headerRefs.current[region.id] = el;
              }}
              className="region-accordion__header"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => {
                onToggle(region.id);
              }}
              onKeyDown={(e) => {
                handleKeyDown(e, region.id);
              }}
            >
              <span className="region-accordion__title">{region.name}</span>
              <span className="region-accordion__chevron" aria-hidden="true">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="region-accordion__panel"
              >
                {region.markers[0] && (
                  <p className="region-accordion__label">
                    {region.markers[0].label}
                  </p>
                )}
                <p className="region-accordion__detail">{detail}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
