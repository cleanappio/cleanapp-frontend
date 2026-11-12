# Map spires

Dots on the globe show where reports are. Spires show how many: a tiered
tower whose height grows with the report count, so hotspots stand out.

- Code: `src/lib/map-spires.ts` (pure geometry and one `applySpires` call);
  wired in `src/components/GlobeView.tsx` in the effect marked "Spires".
- **Physical**: points from `/api/v4/reports/points` are grouped into 1-degree
  cells; cells with at least 2 reports get a spire, colored green to red.
- **Digital**: the 250 brands with the most reports get a spire in the brand
  color at the brand's dot. Showing all ~53,000 brands hid the hotspots.
- Height is logarithmic in the count, capped at 1,300 km at whole-globe zoom,
  and halves with each zoom level so it stays the same size on screen. The
  layer fades out between zoom 6.2 and 7.4.
- Spires point straight up, so from directly overhead (pitch 0, the default
  view) they are only visible near the edge of the globe. Tilt the map to see
  them over land.

Tuning knobs, all in `map-spires.ts`: `TIERS` (silhouette), `MAX_HEIGHT_M`,
the exponent in `spireHeight`, base radius (passed by `GlobeView`).
