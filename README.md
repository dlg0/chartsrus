# Production chart renderer

This React + TypeScript + Vite app is the production path that came out of the chart-renderer bake-off. The bake-off compared Recharts, Observable Plot, visx + D3, and Plotly for dense analytical modelling outputs. **visx + D3 won** because it directly renders the shared explicit chart geometry while preserving React ownership of state, layout, and interaction.

Highcharts was intentionally not included in the bake-off.

## Production direction

The renderer is built around a library-neutral `StackChartSpec` and shared geometry/inspection utilities. The selected visx renderer consumes that source of truth directly for:

- fixed plot geometry;
- compact shared legend with drawer;
- docked slice-first inspector;
- irregular model years;
- positive/negative diverging stacks;
- sign-changing series that keep one logical colour and identity;
- regular/cumulative mode, net line, and NDC target overlays;
- fullscreen plus compact/full PNG export.

The previous non-winning renderers have been removed from the app and dependencies. See [`docs/comparison-notes.md`](docs/comparison-notes.md) for the bake-off decision record and limitations found in each library.

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

The shared fixture uses the same library-neutral `StackChartSpec` shape across the chart cards. It includes:

- irregular model years: 2025, 2026, 2027, 2030, 2035, 2040, 2050, 2060, 2070;
- 26 Australia emissions sector/subsector series with long canonical labels and compact display labels;
- positive emissions and negative removals/offsets in `Mt CO₂-e`;
- sign-changing stress-test series: `Reversal buffer` goes from negative to positive, and `Bio/e-fuels` goes from positive to negative;
- non-linear sector progressions loosely shaped like an Australia decarbonisation scenario, but clearly prototype-only rather than official projections.

## Current production gaps

- Accessibility and keyboard workflows need a first hardening pass beyond the prototype interactions.
- Worst-case real-data performance still needs to be measured with maximum expected series/year counts.
- The shared `signedBands` transform tapers at model-year grid points; decide whether production needs interpolated sub-year zero-crossing vertices.
