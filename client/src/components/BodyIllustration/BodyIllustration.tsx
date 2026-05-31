import './BodyIllustration.css';

import type { Region } from '../../types/contract';
import { RegionMarkers } from '../RegionMarkers';

interface BodyIllustrationProps {
  regions: Region[];
  selectedRegionId: string | null;
  onSelect: (regionId: string) => void;
}

/**
 * Fixed aspect-ratio box holding the faint body image + the marker overlay, so
 * percent-positioned markers never drift regardless of viewport width.
 *
 * Deselection is handled by the Explorer root click handler (clicking anywhere
 * that isn't an interactive element clears the selection), so this component
 * stays presentational.
 */
export function BodyIllustration({
  regions,
  selectedRegionId,
  onSelect,
}: BodyIllustrationProps) {
  return (
    <div className="body-illustration">
      <img
        className="body-illustration__image"
        src="/anatomy/body-outline.png"
        alt="Human body outline with disease markers"
      />
      <RegionMarkers
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelect={onSelect}
      />
    </div>
  );
}
