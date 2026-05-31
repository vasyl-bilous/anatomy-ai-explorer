# Figma Design Spec — Dev_Test_CytoReason

> Extracted from the Figma file via the Figma MCP for use during planning and
> implementation. The mockups are a **guideline, not a strict spec** (per
> `PROJECT.md`). Where states are missing (AI analysis, loading, error, mobile)
> we extend in the same visual language.

- **File:** `Dev_Test_CytoReason`
- **File key:** `b8DWtDXfA6djTkms0rERIi`
- **Figma link:** <https://www.figma.com/design/b8DWtDXfA6djTkms0rERIi/Dev_Test_CytoReason?node-id=0-66&m=dev>
- **Canvas:** single page (`Page 1`, node `0:1`) with **two 1280×988 frames**:
  - `0:66` — **Main Explorer** ("Disease Navigator", full-body view)
  - `3:82` — **Drill-Down** (Alzheimer's → brain region view)

---

## 0. Interaction model (source of truth for the flow)

> This is the agreed mental model for the prototype. It resolves the one
> ambiguity in the mockups: **drill-down is bound to the currently selected
> region** — you must select a region first; only then does the drill-down
> action navigate into that region.

### The flow

```
Screen A — full body                          Screen B — drill-down (organ)
┌──────────────────────────────┐              ┌──────────────────────────────┐
│ Disease list │   ⊙ body       │  Next level  │ Region list │   🧠 organ      │
│ [Alzheimer's]←→ 🔴 marker      │ ───────────► │ [Hippocampus]│   • marker     │
│   (selection is two-way,      │  (navigates  │ + Generate   │   • marker     │
│    does NOT navigate)         │  the SELECTED│   AI Analysis│   (tooltips)   │
└──────────────────────────────┘   region)    └──────────────────────────────┘
   body is fully REPLACED by the organ — drill-down is a new screen, not an overlay
```

### Step-by-step

| Step | User action                               | Result                                                                |
| ---- | ----------------------------------------- | --------------------------------------------------------------------- |
| 1    | Click a 🔴 marker on the body             | The matching disease **card is highlighted**. **No navigation.**      |
| 1b   | Click a disease **card** in the list      | The matching **marker is highlighted**. **No navigation.** (two-way)  |
| 2    | Click **"Next level"** (drill-down)       | **Navigates** into the drill-down screen **for the selected region**. |
| 3    | (Screen B) Hover a marker                 | Tooltip with contextual info about that brain region.                 |
| 3b   | (Screen B) Click a region card / marker   | Two-way highlight within the organ view (same contract as step 1).    |
| 4    | (Screen B) Click **Generate AI Analysis** | Async analysis: `idle → processing → completed │ failed (retry)`.     |

### Hard rules (from `PROJECT.md`)

- **Selection ≠ navigation.** Clicking a marker or card only highlights; it must
  not auto-open the drill-down (PROJECT.md line 49).
- **Drill-down is an explicit, separate action** — the "Next level" button
  (PROJECT.md line 50).
- **Drill-down is region-bound (decided):** the button acts on the _currently
  selected_ region. With nothing selected, the drill-down action is
  **disabled** (or prompts the user to pick a region first).
- **Drill-down replaces, not overlays:** Screen B is a dedicated screen; the
  body illustration is replaced by the organ illustration with its own markers
  and its own region list (PROJECT.md lines 58–61).

### Implications for implementation

- A single `selectedRegionId` drives both the card highlight and the marker
  highlight on each screen (shared selection state).
- The drill-down button's `disabled` state is derived from
  `selectedRegionId == null`.
- Navigation carries the selected region id so Screen B knows which organ to
  render (e.g. Alzheimer's → brain). The provided drill-down is the **brain**;
  other regions can show a "coming soon"/placeholder or be extended.

---

## 1. Design tokens

### Colors

| Token            | Hex / value             | Usage                                  |
| ---------------- | ----------------------- | -------------------------------------- |
| Background page  | `#F8F9FA`               | App background, nav background         |
| Surface white    | `#FFFFFF`               | Cards, footer background               |
| Card surface alt | `#F8F7F5`               | "Next level" button shadow/surface     |
| Primary / accent | `#5973D1`               | Active tab, avatar bg, primary markers |
| Text primary     | `#0A0A0A`               | Headings, card titles                  |
| Text strong      | `#262626`               | Nav links                              |
| Text muted       | `#717182`               | Subtitle, secondary text               |
| Text on primary  | `#FFFFFF` / `#FCFCFC`   | Text on accent surfaces                |
| Footer text      | `#364153`               | Copyright                              |
| Footer link      | `#6A7282`               | Privacy / Terms                        |
| Border subtle    | `rgba(0,0,0,0.1)`       | Card borders (`strokeWeight: 1px`)     |
| Divider          | `rgba(198,198,198,0.5)` | Nav bottom border, footer top border   |

### Marker palette (body/brain dots)

| Hex                  | Note                       |
| -------------------- | -------------------------- |
| `#2EC5D1`            | Teal                       |
| `#D12429`            | Red                        |
| `#FF8000`            | Orange                     |
| `#5973D1`            | Blue (= primary)           |
| `#FF0000`            | Red marker core            |
| `rgba(255,0,0,0.27)` | Red marker outer glow/halo |

### Typography

Two families: **Inter** (content) and **SF Pro** (chrome — nav/footer).

| Style              | Family | Weight       | Size | Line height | Usage                      |
| ------------------ | ------ | ------------ | ---- | ----------- | -------------------------- |
| Page title (H1)    | Inter  | 400          | 20   | 31.5px      | "Disease Navigator"        |
| Subtitle           | Inter  | 400          | 14   | 21px        | Intro paragraph (muted)    |
| Section heading    | Inter  | 500 (Medium) | 15.8 | 24.5px      | "Diseases"                 |
| Card title         | Inter  | 400          | 12.3 | 17.5px      | Disease / region name      |
| Card label (badge) | Inter  | 400          | 10.5 | 14px        | Category (70% opacity)     |
| Tab label          | Inter  | 500 (Medium) | 12.3 | 17.5px      | "By disease" / "By system" |
| Nav link           | SF Pro | 510 (Medium) | 14   | 20px        | Nav, avatar initials       |
| Footer             | SF Pro | 400          | 12   | 16px        | Copyright, Privacy, Terms  |

### Effects & radii

- Card / button border radius: **8.75px**; tab/button: **6.75px**.
- Avatar: fully rounded (pill).
- Footer/header shadow: `boxShadow: 0px 0px 8px 0px rgba(0,0,0,0.08)`.

---

## 2. Shared chrome (both screens)

### Top nav (`height: 60px`, padding `0 16px`, space-between, bg `#F8F9FA`, 1px bottom divider)

- **Left:** `cytoreason-logo` (SVG, ~69×38).
- **Right** (row, gap 24px): links `Notebook documentation`, `CytoPedia`,
  `Support` (SF Pro 510, `#262626`), then a **circular avatar** `YS`
  (32×32, bg `#5973D1`, text `#FCFCFC`).

### Footer (`height: 24px`, white, 1px top divider, soft shadow)

- Left: `© 2026 CytoReason. All rights reserved.` (`#364153`).
- Right (row, gap 20px): `Privacy Policy`, `Terms of Use` (`#6A7282`).

### Layout shell

- Frame: 1280×988, column. Main content area starts at `y: 60` (below nav),
  height 903. There's a 48px left gutter (`width: 48` container) before content.

---

## 3. Screen A — Main Explorer (`0:66`, "1280w default")

Full-body view. Two synchronized halves: **left list panel** + **right body
illustration with markers**.

### Left panel — Disease list (`Frame 1810`, width ~520, padding `30 25`)

- **H1 row:** small icon button (18×18 SVG) + `Disease Navigator`.
- **Subtitle:** _"An interactive, human data–powered view of disease biology
  across systems and organs"_ (muted, width ~238).
- **Tab switcher** (`Group 1807`, 212×32): two pills —
  - `By disease` — **active** (bg `#5973D1`, white text).
  - `By system` — inactive (transparent, muted text).
- **Section heading:** `Diseases`.
- **Disease cards** (`Frame 1807`, column, gap 5, each card 196×60,
  radius 8.75, border `rgba(0,0,0,0.1)` 1px). Each card = **title** + **category
  badge** (badge at 70% opacity). The list:

  | #   | Disease                      | Category     | Notes                                    |
  | --- | ---------------------------- | ------------ | ---------------------------------------- |
  | 1   | Alzheimer's Disease          | Neurological | Has trailing chevron/`…` icon            |
  | 2   | Ulcerative Colitis           | Autoimmune   |                                          |
  | 3   | Rheumatoid Arthritis         | Autoimmune   |                                          |
  | 4   | Type 2 Diabetes              | Metabolic    |                                          |
  | 5   | Crohn's Disease              | Autoimmune   |                                          |
  | 6   | COPD                         | Respiratory  |                                          |
  | 7   | Systemic Lupus Erythematosus | Autoimmune   |                                          |
  | 8   | Parkinson's Disease          | Neurological |                                          |
  | 9   | Asthma                       | Respiratory  |                                          |
  | 10  | Psoriasis                    | Autoimmune   | **Selected/hover** (`strokeWeight: 2px`) |

  > Card #1 (Alzheimer's) is the entry into the brain drill-down (Screen B).

### Right — Human body illustration (`Container` 504×1120, body outline ~642×842, opacity 0.4)

- **Body outline** is a background image (`imageRef 6304f22a…`), faint (opacity 0.4).
- **Region markers** — SVG dots, **45×45px**, absolutely positioned over the
  body. ~11 markers total (`Group 1807`–`1818`, `Group 1809`–`1814`). Marker
  positions (relative to their container), as `(x, y)`:

  | Marker     | x   | y   |
  | ---------- | --- | --- |
  | Group 1814 | 100 | 788 |
  | Group 1815 | -6  | 538 |
  | Group 1816 | 265 | 872 |
  | Group 1817 | 49  | 652 |
  | Group 1818 | 62  | 847 |
  | Group 1809 | 653 | 112 |
  | Group 1810 | 712 | 204 |
  | Group 1811 | 603 | 330 |
  | Group 1812 | 802 | 486 |
  | Group 1813 | 698 | 531 |
  | Group 1814 | 682 | 382 |

  Marker anatomy: outer halo `rgba(255,0,0,0.27)` (45×45) → mid ring → core dot
  `#FF0000` (~18×18, centered). Other dots use the teal/red/orange/blue palette.

- **"Next level" button** — absolutely positioned (top-right of body area,
  `x: 211, y: 227`, 77×32, radius 8.75, surface `#F8F7F5`, 1px border). This is
  the **explicit drill-down trigger** (`PROJECT.md`: selection must NOT
  auto-navigate; a separate button enters drill-down).

### Interaction contract (from PROJECT.md)

- Click region (marker) → highlights matching card; click card → highlights
  matching marker. **Selection does not navigate.**
- "Next level" / drill-down button performs the navigation to Screen B.

---

## 4. Screen B — Drill-Down: Brain (`3:82`, "1280w default")

Same chrome. Alzheimer's selected → full-body replaced by a **brain
illustration** + brain-region list.

### Left panel — Brain regions (`Frame 1810`, width ~327, padding `30 25`, absolute `x:0, y:8`)

- **H1 row:** icon + `Disease Navigator` (same as Screen A).
- **Subtitle:** same intro paragraph (muted, 320×113 block).
- **Region list** (`Container` 196×789, `overflowScroll: x,y`, column, gap 14):
  - Header row: small SVG icon (17.5×17.5) + `Diseases` heading (Inter 500, 15.8).
  - **Region cards** (`width: fill`, height 60, radius 8.75, 1px border
    `rgba(0,0,0,0.1)`, title Inter 400 12.3 `#0A0A0A`):

  | #   | Brain region                         |
  | --- | ------------------------------------ |
  | 1   | Entorhinal Cortex                    |
  | 2   | Hippocampus                          |
  | 3   | Cerebral Cortex                      |
  | 4   | Amygdala                             |
  | 5   | Basal Forebrain (Cholinergic System) |
  | 6   | Frontal Lobe                         |
  | 7   | Parietal Lobe                        |

  > Brain-region cards here have **no category badge** (unlike disease cards).

### Right — Brain illustration + markers

- **Brain image** (`RECTANGLE 4b895cb9…`, `imageRef 30bdb110…`, `scaleMode FILL`,
  673×630, absolute `x: 307, y: 160`). This is the provided brain illustration.
- **Markers** — 5 dots (`Group 1809`–`1813`), **45×45px**, absolute positions
  (relative to the 1280-wide frame):

  | Marker     | x   | y   |
  | ---------- | --- | --- |
  | Group 1809 | 574 | 293 |
  | Group 1810 | 789 | 472 |
  | Group 1811 | 686 | 584 |
  | Group 1812 | 510 | 459 |
  | Group 1813 | 404 | 283 |

  Same marker anatomy as Screen A: halo `rgba(255,0,0,0.27)` → core `#FF0000`
  (~18×18 inner at offset 13.42,13.42 within the 45×45 box).

- **Markers should show tooltips on hover** (`PROJECT.md`) — not present as
  separate nodes in Figma; implement in code.

---

## 5. What the mockups do NOT cover (we design these)

Per `PROJECT.md`, extend in the same visual language:

- **Accordion side panel** in drill-down with details per region (the Figma list
  is flat cards; spec calls for an accordion).
- **Marker tooltips** on hover.
- **"Generate AI Analysis"** action + its four states:
  - **Idle** — button enabled.
  - **Processing** — loading/progress indicator; block duplicate submits.
  - **Completed** — summary, key findings, confidence score (e.g. 87%),
    timestamp/status metadata.
  - **Failed** — error state with retry.
- **Responsive / mobile** layout (Figma is 1280 desktop only).
- **Empty / no-selection** states.

### AI analysis — example completed output (from PROJECT.md)

> **Summary:** Potential abnormal activity detected in the selected brain region.
> **Key Findings:**
>
> - Increased signal intensity around the selected marker
> - Possible correlation with neighboring highlighted dots
> - Moderate confidence based on available input data
>
> **Confidence: 87%**

---

## 6. Image assets in the file (for `download_figma_images` if needed)

| Asset                  | Ref / node                                          | Notes              |
| ---------------------- | --------------------------------------------------- | ------------------ |
| CytoReason logo        | `cytoreason-logo-CRhYTMrw.svg`                      | Nav logo, ~69×38   |
| Human body outline     | `imageRef 6304f22a522299372c515c56c67458c2c946fa30` | Screen A, faint bg |
| Brain illustration     | `imageRef 30bdb1102c31a5db8056c52b09d9c14c2afae8c0` | Screen B, 673×630  |
| Page bg texture (both) | `imageRef 00a7fd435e8f1a0a791d975e9c33e933de4f9dd1` | decorative         |
| Region markers         | `Group 18xx` IMAGE-SVG nodes                        | 45×45 dots         |

> Marker coordinates above are Figma absolute positions for a 1280-wide frame.
> For the React implementation, prefer storing region marker positions as
> **percentages** of the illustration box so they scale responsively, rather
> than hardcoding pixel offsets.
