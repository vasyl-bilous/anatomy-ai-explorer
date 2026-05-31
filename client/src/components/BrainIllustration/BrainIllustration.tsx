import './BrainIllustration.css';

import { useState } from 'react';

import type { Region } from '../../types/contract';

interface BrainIllustrationProps {
  regions: Region[];
  selectedRegionId: string | null;
  /** Two-way highlight: selecting a marker selects its brain sub-region. */
  onSelect: (regionId: string) => void;
}

/**
 * Fixed aspect-ratio box holding the brain image + a marker overlay. Markers are
 * real <button>s positioned by % of the box (translate(-50%,-50%)), mirroring
 * the M6 RegionMarkers approach. Hover (tooltip) is tracked separately from
 * selection — they are distinct concerns.
 */
export function BrainIllustration({
  regions,
  selectedRegionId,
  onSelect,
}: BrainIllustrationProps) {
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  return (
    <div className="brain-illustration">
      <img
        className="brain-illustration__image"
        src="/anatomy/brain.png"
        alt="Illustration of a human brain with highlighted sub-region markers"
      />
      <div className="brain-illustration__markers">
        {regions.flatMap((region) =>
          region.markers.map((marker) => {
            const isSelected = region.id === selectedRegionId;
            const isHovered = marker.id === hoveredMarkerId;
            return (
              <button
                key={marker.id}
                type="button"
                className={
                  'brain-illustration__marker' +
                  (isSelected ? ' brain-illustration__marker--selected' : '')
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
                  <span className="brain-illustration__tooltip" role="tooltip">
                    <span className="brain-illustration__tooltip-title">
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
    </div>
  );
}
