# Map spires and the decluttered globe

Dots on the globe show where reports are. Spires show how many: a slender
cone, tapering evenly from the ground to a point, whose height grows with the report count, so hotspots stand out.

Code: `src/lib/map-spires.ts` (pure geometry plus `applySpires` and
`applyDigitalDeclutter`), wired in `src/components/GlobeView.tsx` in the
effect marked "Spires". Opening view: `src/lib/visitor-view.ts`.

## What is drawn

- **Only real hotspots get a spire.** Physical: reports are grouped into
  1-degree cells and the 60 busiest get a column, labelled with the count, in
  one blue that deepens with height. Digital: the 40 largest brands get a
  column in the brand color, labelled "Name · count". Everything else stays a
  dot.
- **Brand dots: many and small from afar** (`DIGITAL_DOT_TIERS`,
  `DIGITAL_DOT_SCALE`). About 53,000 brands exist. The far view shows brands
  with 3+ reports (about 15,600) at 40% of full dot size, so the globe looks
  full without being a solid carpet; 2+ from zoom 4.5; all from 5.5, growing
  to full size by zoom 7.5. Per-dot brand labels
  start at zoom 5. This applies to both layers that draw brand dots
  (`digital-nodes` and `report-pins`), which is why digital features carry a
  numeric `total` property.
- Height is logarithmic in the count, capped at 2,400 km at whole-globe zoom,
  and halves with each zoom level so it stays the same size on screen. Spires
  and their labels fade out between zoom 4.8 and 5.8.
- The globe opens untilted and centered on the screen, roughly over the
  visitor's region (from the browser's time zone: no permission prompt, no
  network call, region-level only). A visitor who has granted location access
  is still flown to their actual position.
- Physical and digital spires are computed separately and replaced whenever
  the tab changes.

## Why it looks like this (2026-11-12, with Boris)

1. Four stacked blocks: "wedding cake".
2. A 16-slice flared needle: showed rings up close, and with a spire on every
   spot plus every brand dot and label, "hella cluttered".
3. Straight columns, hotspots only, one color scale per tab, dots thinned by
   zoom: "better".
4. Pointed caps on straight shafts ("obelisks"); physical columns thicker and a stronger blue;
   physical report dots 30% smaller so columns read above them.
5. One even taper from base to tip; shipped.
6. 2026-11-13: the 38 degree opening tilt put the globe off-center and the
   500+ dot threshold looked sparse. Current: no tilt, taller spires, many
   small brand dots.

Tuning knobs: hotspot counts and column radius (in `GlobeView`),
`DIGITAL_DOT_TIERS`, `DIGITAL_DOT_SCALE`, `MAX_HEIGHT_M`, the exponent in `spireHeight`, the fade
zooms, `DEFAULT_PITCH`.

## Idle spin

Both globes turn slowly about the Earth's axis, west to east, one full turn in
about six minutes (`src/lib/globe-spin.ts`, started from the "Idle spin"
effect in `GlobeView`). Added 2026-11-13 at Boris's request.

It yields to everything: any touch, drag, scroll or key press stops it, and it
resumes five seconds after the map was last moved. It never starts while the
app is flying the map somewhere, holds still while a report or brand is
selected, the menu is open or the visitor is drawing, stops above zoom 3.5,
and does not run under `prefers-reduced-motion`.

Tuning: `SPIN_DEGREES_PER_SECOND`, `RESUME_AFTER_MS`, `MAX_SPIN_ZOOM`.
