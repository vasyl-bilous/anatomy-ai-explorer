import './DrillDownPage.css';

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AnalysisPanel } from '../components/AnalysisPanel';
import { AppShell } from '../components/AppShell';
import { BrainIllustration } from '../components/BrainIllustration';
import { ComingSoon } from '../components/ComingSoon';
import { RegionAccordion } from '../components/RegionAccordion';
import { useRegion, useRegions } from '../lib/queries';
import { useAnalysis } from '../lib/useAnalysis';

/**
 * Screen B — region drill-down. `:id` is the BODY region the user drilled into.
 * Brain data exists only for Alzheimer's, so we decide structurally: if any
 * brain sub-region's parentId === this id, render the brain drill-down;
 * otherwise show a tidy "Coming soon" placeholder.
 *
 * State approach: the drill-down subtree is shallow (this page renders the
 * illustration, accordion and analysis panel as direct children), so the single
 * `selectedRegionId` and the analysis state live here and are passed down one
 * level. That stays well under the ~3-level threshold where a DrillDownProvider
 * would earn its keep, so we deliberately avoid Context (and Zustand) here.
 */
export function DrillDownPage() {
  const { id } = useParams<{ id: string }>();
  // Remount the view (and thus reset useAnalysis' state) whenever the region
  // changes — the canonical React reset-on-identity-change via `key`.
  return <DrillDownView key={id ?? ''} regionId={id ?? ''} />;
}

function DrillDownView({ regionId: id }: { regionId: string }) {
  const bodyRegion = useRegion(id);
  const brainRegions = useRegions('brain');

  // The brain sub-regions that belong to THIS body region (Alzheimer's).
  const childRegions = useMemo(
    () => (brainRegions.data ?? []).filter((r) => r.parentId === id),
    [brainRegions.data, id],
  );
  const hasDrillDown = childRegions.length > 0;

  // Single source of truth shared by the markers and the accordion.
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // The analysis targets the drilled-in body region.
  const { state, generate, retry, regenerate, fromCache } = useAnalysis(
    id ?? '',
  );

  const isPending = bodyRegion.isPending || brainRegions.isPending;
  const isError = bodyRegion.isError || brainRegions.isError;

  function toggleRegion(regionId: string) {
    // Two-way highlight + accordion expand/collapse off one id.
    setSelectedRegionId((prev) => (prev === regionId ? null : regionId));
  }

  function selectFromMarker(regionId: string) {
    setSelectedRegionId(regionId);
  }

  if (isPending) {
    return (
      <AppShell>
        <p className="drilldown__status" role="status">
          Loading region…
        </p>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell>
        <div
          className="drilldown__status drilldown__status--error"
          role="alert"
        >
          <p>Failed to load this region.</p>
          <Link to="/" className="drilldown__back-link">
            Back to Explorer
          </Link>
        </div>
      </AppShell>
    );
  }

  const region = bodyRegion.data;

  if (!hasDrillDown) {
    return (
      <AppShell>
        <ComingSoon regionName={region.name} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="drilldown">
        <div className="drilldown__topbar">
          <Link to="/" className="drilldown__back">
            ← Back to Explorer
          </Link>
          <h1 className="drilldown__title">{region.name}</h1>
        </div>

        <div className="drilldown__layout">
          <aside className="drilldown__panel">
            <h2 className="drilldown__panel-title">Brain regions</h2>
            <RegionAccordion
              regions={childRegions}
              selectedRegionId={selectedRegionId}
              onToggle={toggleRegion}
            />
            <AnalysisPanel
              regionName={region.name}
              state={state}
              fromCache={fromCache}
              onGenerate={generate}
              onRetry={retry}
              onRegenerate={regenerate}
            />
          </aside>

          <section className="drilldown__illustration">
            <BrainIllustration
              regions={childRegions}
              selectedRegionId={selectedRegionId}
              onSelect={selectFromMarker}
            />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
