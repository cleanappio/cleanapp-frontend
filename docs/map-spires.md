# Map spires

Dots on the globe show where reports are. Spires show how many: a slim needle
with a gently flared foot whose height grows with the report count, so
hotspots stand out. (The first version used four stacked blocks and looked
like a wedding cake; the needle is built from 16 thin slices along a smooth
curve.)

- Code: `src/lib/map-spires.ts` (pure geometry and one `applySpires` call);
  wired in `src/components/GlobeView.tsx` in the effect marked "Spires".
- **Physical**: points from `/api/v4/reports/points` are grouped into 1-degree
  cells; cells with at least 2 reports get a spire, colored green to red.
- **Digital**: the 250 brands with the most reports get a spire in the brand
  color at the brand's dot. Showing all ~53,000 brands hid the hotspots.
- Height is logarithmic in the count, capped at 1,300 km at whole-globe zoom,
  and halves with each zoom level so it stays the same size on screen. The
  layer fades out between zoom 6.2 and 7.4.
- Spires point straight up and vanish from directly overhead, so the globe
  now opens tilted 38 degrees.
- The globe opens roughly over the visitor instead of at 0,0. The position
  comes from the browser's time zone (`src/lib/visitor-view.ts`): no
  permission prompt, no network call, region-level only. A visitor who has
  granted location access is still flown to their actual position.
- Physical and digital spires are computed separately and replaced whenever
  the tab changes.

Tuning knobs, all in `map-spires.ts`: `radiusAt` and `SLICES` (silhouette), `MAX_HEIGHT_M`,
the exponent in `spireHeight`, base radius (passed by `GlobeView`).
