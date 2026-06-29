# Chart renderer bake-off

This is a fresh React + TypeScript + Vite prototype for comparing chart-rendering approaches for dense analytical modelling outputs. It evaluates:

- Recharts
- Observable Plot embedded in React
- visx + D3
- Plotly (partial `plotly.js-basic-dist-min` bundle)

Highcharts is intentionally not included.

## Purpose

The goal is not a polished demo. The goal is to stress-test whether each renderer can support a stable, high-density chart model for energy and emissions modelling outputs: fixed plot geometry, compact legends, docked stack-slice inspection, irregular model years, and correct positive/negative diverging stack semantics.

## Install and run

```bash
npm install
npm run dev
```

Run utility tests:

```bash
npm test
```

Build check:

```bash
npm run build
```

## Fixture coverage

The shared fixture uses the same library-neutral `StackChartSpec` for every renderer. It includes:

- irregular model years: 2025, 2026, 2027, 2030, 2035, 2040, 2050, 2060, 2070;
- 26 Australia emissions sector/subsector series with long canonical labels and compact display labels;
- positive emissions and negative removals/offsets in `Mt CO₂-e`;
- sign-changing stress-test series: `Reversal buffer` goes from negative to positive, and `Bio/e-fuels` goes from positive to negative;
- non-linear sector progressions loosely shaped like an Australia decarbonisation scenario, but clearly prototype-only rather than official projections.

## What to compare

Look for these behaviours in the `ChartLab` page:

- stable plot geometry as legends and inspectors change;
- no intrusive floating tooltip;
- **Legend**: compact colour legend with a drawer for all series;
- double-click a legend/drawer row to isolate one trace; while isolated, click additional legend/drawer rows to add/remove traces, or use `show all`;
- **Inspector**: a one-line selected-year strip by default; click it or pin a year to expand the compact value/composition table;
- per-chart tools for regular/cumulative mode, net line, and NDC target overlay;
- `save image` on each chart card exports a high-resolution PNG of that compact card as displayed;
- `save full` exports the chart with all legend items and all inspector rows expanded inside the saved image;
- `fullscreen` on each chart card expands that card to fill the screen and forces the same full detail (every legend item and every inspector row visible) while the plot grows to fit; each renderer resizes into the larger area, Plotly included;
- one, two, or three chart columns via the columns control;
- docked slice-first inspector for the selected model year;
- pointer inspection by nearest scaled year, not nearest polygon;
- click-to-pin, Esc-to-clear, and left/right keyboard navigation;
- hover/focus highlighting from legend and inspector rows;
- correct positive and negative stack totals;
- handling of sign-changing series without misleading polygons across zero. The shared stack transform places sign-changing series nearest the zero baseline on both positive and negative sides, preserving one logical colour and identity.

## Renderer limitations

### Recharts

Recharts is quick to wire up and integrates naturally with React, but it does not cleanly consume explicit `y0`/`y1` stack cells as the rendered area geometry. This prototype uses the shared stack utility as the source of truth for domains, slices, totals, and inspection. For sign-changing series, it splits each logical series into positive and negative render keys with the same colour so Recharts does not draw a single misleading crossing area. It is still less explicit than the Observable Plot and visx versions.

### Observable Plot

Observable Plot has a concise grammar and can render explicit `y0`/`y1` geometry from `StackCell[]`. The latest official Observable Plot docs still recommend `useRef` + `useEffect` + remove/recreate for interactive client-side React usage; SSR/virtual-DOM rendering exists but is recommended only for simpler/smaller plots. So the integration is somewhat less React-native, but not an implementation mistake.

### visx + D3

visx + D3 requires the most code, but it owns scales, axes, paths, hit-testing, cursor, highlights, and explicit diverging stack geometry. It is the reference implementation for maximum control.

### Plotly

Plotly sits between Observable Plot and visx. Like Observable Plot it embeds a non-React chart through a ref, but it uses `Plotly.react` so updates diff in place instead of remove/recreate, and `uirevision` keeps any user zoom across those updates. It still consumes the shared `StackCell` y0/y1 geometry rather than Plotly's own stacking: each contiguous same-sign segment is one closed `fill: "toself"` polygon, so sign-changing series keep one colour and never draw a misleading area across zero. To stay inside the prototype's rules it disables Plotly's own legend and floating hover label (the shared compact legend and docked inspector remain the single legend/inspection system), but it does show off the native parts that do not fight those rules: crisp gridlines and axes, an x spikeline as the live hover cursor, and a curated modebar with zoom/pan/reset and a 3x PNG export. Its main cost is bundle weight: even the partial `plotly.js-basic-dist-min` bundle is much larger than the other renderers.

## More notes

See [`docs/comparison-notes.md`](docs/comparison-notes.md) for implementation notes and qualitative assessment.
