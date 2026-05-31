import type { Region } from '../../types/contract';

import './DiseaseCard.css';

interface DiseaseCardProps {
  region: Region;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

/** One disease card: title + optional category badge. Selection-only (no navigation). */
export function DiseaseCard({
  region,
  isSelected,
  onSelect,
}: DiseaseCardProps) {
  return (
    <button
      type="button"
      className={'disease-card' + (isSelected ? ' disease-card--selected' : '')}
      aria-pressed={isSelected}
      onClick={() => {
        onSelect(region.id);
      }}
    >
      <span className="disease-card__title">{region.name}</span>
      {region.category !== null && (
        <span className="disease-card__badge">{region.category}</span>
      )}
    </button>
  );
}
