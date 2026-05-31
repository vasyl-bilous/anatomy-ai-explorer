import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

/**
 * Seed reference data for the Anatomy AI Explorer: body diseases (Screen A) and
 * the brain sub-regions of Alzheimer's (Screen B), each with marker anchors.
 *
 * Marker coordinates are PERCENTAGES of the screen's illustration box (see
 * src/shared/contracts/README.md):
 * - Brain markers: derived from Figma via `(mx-307)/673`, `(my-160)/630`.
 * - Body markers: Figma's body coords are inconsistent, so we place them at
 *   anatomically sensible % values instead of reproducing Figma pixels.
 *
 * Data provenance: in production this content would come from an ETL/curation
 * pipeline over curated medical ontologies (MONDO / Disease Ontology / ICD-11,
 * UBERON / FMA) or a partner data SDK — not hand-written constants. The hardcoded
 * lists below are the prototype stand-in for that pipeline. See ADR 0001.
 *
 * Run: manual in dev (`npm run prisma:seed`); a release-phase step in prod
 * (`npm run db:setup`), never from the app runtime. See ADR 0001.
 *
 * Idempotent: clears markers + regions, then re-inserts. Safe to re-run.
 */

// Marker color — all dots are the red core (#FF0000 + halo applied in the UI),
// matching the Figma design for both body and brain markers.
const MARKER_COLOR = '#FF0000';

interface MarkerSeed {
  xPct: number;
  yPct: number;
  label: string;
  color: string;
  tooltip: string;
}

interface BodySeed {
  name: string;
  category: string;
  sortOrder: number;
  marker: MarkerSeed;
}

interface BrainSeed {
  name: string;
  sortOrder: number;
  marker: MarkerSeed;
}

// Screen A — 10 body diseases. Marker % are anatomically-placed over the body box.
const BODY_DISEASES: BodySeed[] = [
  {
    name: "Alzheimer's Disease",
    category: 'Neurological',
    sortOrder: 1,
    marker: {
      xPct: 50,
      yPct: 6,
      label: "Alzheimer's Disease",
      color: MARKER_COLOR,
      tooltip: 'Neurodegenerative disease affecting the brain',
    },
  },
  {
    name: 'Ulcerative Colitis',
    category: 'Autoimmune',
    sortOrder: 2,
    marker: {
      xPct: 54,
      yPct: 46,
      label: 'Ulcerative Colitis',
      color: MARKER_COLOR,
      tooltip: 'Chronic inflammation of the colon',
    },
  },
  {
    name: 'Rheumatoid Arthritis',
    category: 'Autoimmune',
    sortOrder: 3,
    marker: {
      xPct: 26,
      yPct: 52,
      label: 'Rheumatoid Arthritis',
      color: MARKER_COLOR,
      tooltip: 'Autoimmune inflammation of the joints',
    },
  },
  {
    name: 'Type 2 Diabetes',
    category: 'Metabolic',
    sortOrder: 4,
    marker: {
      xPct: 46,
      yPct: 42,
      label: 'Type 2 Diabetes',
      color: MARKER_COLOR,
      tooltip: 'Metabolic disorder of blood sugar regulation',
    },
  },
  {
    name: "Crohn's Disease",
    category: 'Autoimmune',
    sortOrder: 5,
    marker: {
      xPct: 48,
      yPct: 50,
      label: "Crohn's Disease",
      color: MARKER_COLOR,
      tooltip: 'Inflammatory bowel disease',
    },
  },
  {
    name: 'COPD',
    category: 'Respiratory',
    sortOrder: 6,
    marker: {
      xPct: 42,
      yPct: 30,
      label: 'COPD',
      color: MARKER_COLOR,
      tooltip: 'Chronic obstructive pulmonary disease',
    },
  },
  {
    name: 'Systemic Lupus Erythematosus',
    category: 'Autoimmune',
    sortOrder: 7,
    marker: {
      xPct: 58,
      yPct: 30,
      label: 'Systemic Lupus Erythematosus',
      color: MARKER_COLOR,
      tooltip: 'Systemic autoimmune disease',
    },
  },
  {
    name: "Parkinson's Disease",
    category: 'Neurological',
    sortOrder: 8,
    marker: {
      xPct: 47,
      yPct: 9,
      label: "Parkinson's Disease",
      color: MARKER_COLOR,
      tooltip: 'Progressive nervous system disorder',
    },
  },
  {
    name: 'Asthma',
    category: 'Respiratory',
    sortOrder: 9,
    marker: {
      xPct: 56,
      yPct: 28,
      label: 'Asthma',
      color: MARKER_COLOR,
      tooltip: 'Chronic airway inflammation',
    },
  },
  {
    name: 'Psoriasis',
    category: 'Autoimmune',
    sortOrder: 10,
    marker: {
      xPct: 30,
      yPct: 60,
      label: 'Psoriasis',
      color: MARKER_COLOR,
      tooltip: 'Autoimmune skin condition',
    },
  },
];

// Screen B — 7 brain sub-regions of Alzheimer's. Five marker positions come from
// Figma (px→%); the remaining two are placed sensibly on the brain box.
const BRAIN_REGIONS: BrainSeed[] = [
  {
    name: 'Entorhinal Cortex',
    sortOrder: 1,
    marker: {
      xPct: 39.7,
      yPct: 21.1,
      label: 'Entorhinal Cortex',
      color: MARKER_COLOR,
      tooltip:
        'Memory and navigation hub; among the first affected in Alzheimer’s',
    },
  },
  {
    name: 'Hippocampus',
    sortOrder: 2,
    marker: {
      xPct: 30.2,
      yPct: 47.5,
      label: 'Hippocampus',
      color: MARKER_COLOR,
      tooltip: 'Central to memory formation; early atrophy in Alzheimer’s',
    },
  },
  {
    name: 'Cerebral Cortex',
    sortOrder: 3,
    marker: {
      xPct: 14.4,
      yPct: 19.5,
      label: 'Cerebral Cortex',
      color: MARKER_COLOR,
      tooltip: 'Outer brain layer; thinning correlates with cognitive decline',
    },
  },
  {
    name: 'Amygdala',
    sortOrder: 4,
    marker: {
      xPct: 56.3,
      yPct: 67.3,
      label: 'Amygdala',
      color: MARKER_COLOR,
      tooltip: 'Processes emotion and emotional memory',
    },
  },
  {
    name: 'Basal Forebrain (Cholinergic System)',
    sortOrder: 5,
    marker: {
      xPct: 71.6,
      yPct: 49.5,
      label: 'Basal Forebrain',
      color: MARKER_COLOR,
      tooltip: 'Source of acetylcholine; degeneration drives memory loss',
    },
  },
  {
    name: 'Frontal Lobe',
    sortOrder: 6,
    marker: {
      xPct: 22,
      yPct: 30,
      label: 'Frontal Lobe',
      color: MARKER_COLOR,
      tooltip: 'Executive function, planning, and personality',
    },
  },
  {
    name: 'Parietal Lobe',
    sortOrder: 7,
    marker: {
      xPct: 62,
      yPct: 24,
      label: 'Parietal Lobe',
      color: MARKER_COLOR,
      tooltip: 'Spatial awareness and sensory integration',
    },
  },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Idempotent reset (markers cascade with regions, but clear both explicitly).
    await prisma.marker.deleteMany();
    await prisma.region.deleteMany();

    // Body diseases (Screen A).
    for (const d of BODY_DISEASES) {
      await prisma.region.create({
        data: {
          name: d.name,
          category: d.category,
          screen: 'body',
          sortOrder: d.sortOrder,
          markers: { create: [d.marker] },
        },
      });
    }

    // Brain sub-regions (Screen B) — children of Alzheimer's Disease.
    const alzheimers = await prisma.region.findFirst({
      where: { name: "Alzheimer's Disease", screen: 'body' },
    });
    if (!alzheimers) throw new Error("Seed: Alzheimer's body region not found");

    for (const r of BRAIN_REGIONS) {
      await prisma.region.create({
        data: {
          name: r.name,
          category: null,
          screen: 'brain',
          sortOrder: r.sortOrder,
          parentId: alzheimers.id,
          markers: { create: [r.marker] },
        },
      });
    }

    const regionCount = await prisma.region.count();
    const markerCount = await prisma.marker.count();
    console.warn(
      `Seed complete: ${String(regionCount)} regions, ${String(markerCount)} markers`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
