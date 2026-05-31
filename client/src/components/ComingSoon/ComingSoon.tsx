import './ComingSoon.css';

import { Link } from 'react-router-dom';

interface ComingSoonProps {
  regionName: string;
}

/**
 * Placeholder for body regions that have no brain-style drill-down yet. The
 * assignment ships only the brain (Alzheimer's), so every other disease lands
 * here rather than us inventing fake organs/markers.
 */
export function ComingSoon({ regionName }: ComingSoonProps) {
  return (
    <div className="coming-soon">
      <h1 className="coming-soon__title">{regionName}</h1>
      <p className="coming-soon__text">
        Drill-down for this region isn&apos;t available yet.
      </p>
      <Link to="/" className="coming-soon__back">
        Back
      </Link>
    </div>
  );
}
