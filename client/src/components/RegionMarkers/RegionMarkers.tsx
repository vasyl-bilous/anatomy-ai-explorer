import { useState } from 'react';

import type { Region } from '../../types/contract';

import './RegionMarkers.css';

interface RegionMarkersProps {
  regions: Region[];
  selectedRegionId: string | null;
  onSelect: (regionId: string) => void;
}

/**
 * Overlay of marker dots, one real <button> per marker, positioned by % of the
 * illustration box. Hover (tooltip) is tracked separately from selection.
 */
export function RegionMarkers({
  regions,
  selectedRegionId,
  onSelect,
}: RegionMarkersProps) {
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  return (
    <div className="region-markers">
      {regions.flatMap((region) =>
        region.markers.map((marker) => {
          const isSelected = region.id === selectedRegionId;
          const isHovered = marker.id === hoveredMarkerId;
          return (
            <button
              key={marker.id}
              type="button"
              className={
                'region-markers__marker' +
                (isSelected ? ' region-markers__marker--selected' : '')
              }
              style={{
                left: `${String(marker.xPct)}%`,
                top: `${String(marker.yPct)}%`,
                ['--marker-color' as string]: marker.color,
              }}
              aria-label={marker.label}
              aria-pressed={isSelected}
              onClick={() => {
                onSelect(region.id);
              }}
              onMouseEnter={() => {
                setHoveredMarkerId(marker.id);
              }}
              onMouseLeave={() => {
                setHoveredMarkerId(null);
              }}
              onFocus={() => {
                setHoveredMarkerId(marker.id);
              }}
              onBlur={() => {
                setHoveredMarkerId(null);
              }}
            >
              {isHovered && (
                <span className="region-markers__tooltip" role="tooltip">
                  <span className="region-markers__tooltip-title">
                    {marker.label}
                  </span>
                  {marker.tooltip}
                </span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
