# API contract & marker positioning (M0)

The frozen client/server contract for the Anatomy AI Explorer. Types live in
[`anatomy.contract.ts`](./anatomy.contract.ts); this note records the decisions
behind them.

## Routes

All feature endpoints are under **`/api/v1`** (global prefix `api` + URI
versioning, default `v1` — `src/core/bootstrap/setup-app.ts`). Health is
version-neutral at `/api/health`. Swagger at `/api/docs`.

| Method | Path                   | Returns (inside the envelope)               |
| ------ | ---------------------- | ------------------------------------------- |
| GET    | `/api/v1/regions`      | `Region[]` (optional `?screen=body\|brain`) |
| GET    | `/api/v1/regions/:id`  | `Region` (with `markers`)                   |
| POST   | `/api/v1/analyses`     | `Analysis` (`202`, `status:'processing'`)   |
| GET    | `/api/v1/analyses/:id` | `Analysis` (poll until terminal)            |

## Response envelope

Every success response is wrapped by `SuccessResponseInterceptor` into
`{ success: true, data, message?, meta? }`. **The client unwraps `.data`
centrally** (in `client/src/lib/api.ts`). Errors come from
`@geren32/nestjs-error-handler` with a different shape — the client has a typed
error path for it too.

## Marker positioning — percentages, not pixels

Markers are stored and served as **percentages (0–100) of their screen's
illustration box**, so the overlay scales responsively. The px→% conversion is
done **once, in the seed** (`src/infrastructure/prisma/seed/seed.ts`); the API
and client only ever see percentages.

### Reference box per screen

- **Screen B (brain)** — exact, from Figma: the brain image sits at `x:307, y:160`,
  size `673×630` within the 1280-frame. For a Figma marker at absolute `(mx, my)`:

  ```
  xPct = (mx - 307) / 673 * 100
  yPct = (my - 160) / 630 * 100
  ```

  Worked example (Group 1809 at `574,293`): `xPct ≈ 39.7`, `yPct ≈ 21.1`.

- **Screen A (body)** — Figma's coordinates here are **inconsistent** (some markers
  are relative to the 504-wide body container, others use 1280-frame globals with
  x up to 802, which can't fit a 504 box). We do **not** reproduce Figma pixels
  for the body. Instead, markers are placed at **anatomically sensible percent
  positions** over the body illustration box. This is acceptable: the mockups are
  "a guideline, not a strict spec" (PROJECT.md), and exact body-marker coordinates
  carry no product meaning. We pick clean % values per region in the seed.

> Rule of thumb: `(0,0)` = top-left of the illustration box, `(100,100)` =
> bottom-right. The component positions each marker with
> `left: xPct%  top: yPct%  transform: translate(-50%,-50%)` so the dot's center
> lands on the point.

### Responsive: the illustration box has a fixed aspect-ratio

Percent positioning only stays accurate if the box never changes its
proportions. So the illustration container carries a **fixed `aspect-ratio`**
equal to the image's natural ratio (e.g. brain `673/630`; body uses its own
ratio). The image fills the box (`width:100%; height:100%; object-fit:contain`),
and markers are `%`-positioned inside it. Because the box scales proportionally
at any viewport width, a marker at `(xPct,yPct)` always lands on the same
anatomical point — it never drifts on mobile.

A marker **is** the "anchor" — it carries `label` + `tooltip`, so hovering it
tells the user which region it is. (If the illustrations turn out to be SVG, an
even tighter option is `<circle>` elements inside the same `viewBox` as the
image; the aspect-ratio box is the asset-agnostic default we chose.)
