# Chart renderer comparison notes

## Decision

The bake-off is closed. **visx + D3 is the selected production renderer** because it directly consumes the shared explicit geometry (`StackCell[]` / `signedBands`) while keeping scales, hit-testing, layout, and interaction in React-owned code. The other implementations were removed from the application and dependency graph; their notes remain here as the decision record.

## Recharts

### What worked

- Fastest renderer to assemble for axes, areas, bars, and responsive sizing.
- React state integration is straightforward.
- Numeric `XAxis type="number"` respects irregular model-year spacing.
- Built-in legend and tooltip can be bypassed in favour of shared compact legend and docked inspector.
- Splitting each logical series into positive and negative render keys avoids the most misleading sign-changing area connection.

### What was awkward

- Recharts does not naturally accept explicit per-cell `y0`/`y1` stack geometry for areas.
- The prototype therefore uses shared stack geometry for domains, readout, inspection, and sign-changing ordering, while Recharts still renders native `stackOffset="sign"` geometry from split positive/negative data keys.
- Custom pointer inspection is implemented outside the default tooltip system, which avoids intrusive tooltips but fights the built-in interaction model.

### Known limitations

- Recharts still cannot consume the exact `StackCell.y0/y1` geometry, so it remains an approximation of the explicit stack source of truth.
- Missing values are represented in the source data and inspector, but rendered geometry is ultimately governed by Recharts internals.

### Overall assessment

Good for quick React charts and acceptable for prototypes. Awkward if explicit stack geometry and one coordinated inspection/control system are core product requirements.

## Observable Plot

### What worked

- Clean chart grammar for explicit `y0`/`y1` cells.
- Numeric scales and rule marks make irregular years and inspection cursor straightforward.
- Positive and negative cells can be rendered from the same shared stack transform.
- Sign-changing series render from the shared `signedBands` geometry as full-width bands that taper to the baseline, stacked nearest zero, with one logical colour and no gap at the crossing.

### What was awkward

- React integration is less idiomatic: an effect creates/replaces an SVG plot on state changes. The current Observable Plot docs still recommend this for client-side React; the alternative SSR/virtual-DOM path is less appropriate for this interactive prototype.
- Event handling and focus coordination live outside Plot's built-in tip/interaction model.

### Known limitations

- The implementation deliberately avoids Observable Plot's default tip because it conflicts with the docked inspector model.
- Bar rendering is included, but irregular years make equal-width bars visually less suitable than area charts.

### Overall assessment

Strong grammar for exploratory chart construction and explicit marks. Viable if the React wrapper lifecycle is acceptable and the team is comfortable with Plot's non-React rendering model.

## visx + D3

### What worked

- Full ownership of scales, axes, grid, paths, cursor, hit-testing, and highlights.
- Uses the shared `StackCell[]` geometry directly.
- Sign-changing series are stacked nearest zero as full-width `signedBands` (one band per sign), meet the baseline without a gap, and preserve one logical series identity and colour for legend and inspection.
- Pointer hit-testing is a transparent overlay using nearest scaled year.

### What was awkward

- More code than Recharts or Observable Plot.
- Visual polish and accessibility require explicit implementation rather than library defaults.

### Known limitations

- The prototype is intentionally compact and not fully production-hardened for export, animation, or very large datasets.
- Area geometry now comes from the shared `signedBands` transform (full-width tapered bands), so zero crossings and decay-to-zero no longer leave gaps; production code may still want true interpolated zero-crossing vertices for sub-year precision.

### Overall assessment

Most work, most control. Likely the best long-term fit if charting is central product infrastructure and exact geometry/interaction semantics matter.

## Plotly

### What worked

- `Plotly.react` diffs data and layout in place, so updates do not remove/recreate the chart the way the Observable Plot wrapper does.
- `uirevision` keeps native UI toggles (hover mode, native legend visibility) stable across data updates, so hover-driven redraws never reset them; toggling mode, overlays, density, or series count intentionally changes the revision key.
- Explicit `StackCell` y0/y1 geometry stays the source of truth: each series is one closed `fill: "toself"` polygon per sign, so sign-changing series keep one logical colour and never connect a misleading area across zero. Bars reuse the same geometry through the native `base` (floating-bar) attribute.
- Area bands span the full year grid and taper to zero thickness at the running base, so neighbours tile edge-to-edge and sign-changing series (and series that decay to zero) meet the baseline cleanly, with no triangular white gaps at sign changes. This is the shared `signedBands` transform: it is the source of truth for the diverging areas in **visx, Observable Plot, and Plotly**, which render it directly. Recharts is the exception - it cannot consume explicit `y0`/`y1` cells and drives its own `stackOffset="sign"`, so it keeps an honest gap at sign changes (feeding zeros for off-sign values does not help: recharts anchors non-negative values at the running positive cumulative and would paint a misleading diagonal sliver).
- Native numeric axis, gridlines, and an x spikeline that tracks the cursor (`hovermode: "x"`, `spikesnap: "cursor"`) cover the irregular model years and the live cursor with very little code.
- A deliberately light modebar adds native controls that do not fight the layout: the select-nearest/show-all hover toggles, plus custom buttons - full screen (which expands the whole card with its full legend and inspector), tools, save image/full, and toggles for the native Plotly tooltip and the native Plotly legend. The logo, the PNG export (the card has its own save image / save full), and the lasso/box-select tools are removed, and the icons are lightened so they sit quietly over the dense plot.
- The shared area/bar/line chart types all render: areas as tiled diverging bands, bars as floating `base` rectangles, and lines as one unstacked trace per series scaled to the per-series value extent.
- The optional native legend groups each logical series under one `legendgroup` entry, so a legend click hides the whole series (`groupclick: "togglegroup"`) and a double-click isolates it, the standard Plotly behaviour, without splitting on the positive/negative render bands.
- Visual output is polished by default (antialiased fills, crisp axes) and integrates with the card-level `html-to-image` export as well as Plotly's own `toImage`.

### What was awkward

- Like Observable Plot, the chart is embedded imperatively through a ref and effects rather than as declarative React children.
- Plotly's defaults assume Plotly owns the legend and a floating hover label. Both are off by default so the shared compact legend and docked inspector stay the single legend/inspection system, but each can be switched on from the modebar to show the native behaviour.
- An earlier version drove inspection from Plotly's `hovermode: "closest"` events, but with `fill: "toself"` polygons the nearest point is the nearest ring vertex, so the cursor jumped erratically. Inspection now uses the renderer's own pointer maths (nearest scaled year, then cell-at-pointer), the same approach as the visx and Recharts versions, and Plotly only draws the cursor spike and the optional native tooltip.
- The bundled `@types/plotly.js` lag the runtime on the `base` (floating-bar) attribute, so one typed cast is needed.
- Zoom/pan had to be turned off. Plotly's exploratory model wants an interactively rescalable axis, but the shared docked inspector computes pointer-to-year/cell against the static data-derived domain; a zoomed or panned range would silently desync inspection. Locking the axes (no `zoom2d`/`pan2d`, `dragmode: false`) is the honest fit for the project's fixed-geometry model, but it means Plotly's headline native interactivity is deliberately discarded here.

### Known limitations

- Bundle weight is the real cost: even the partial `plotly.js-basic-dist-min` bundle is far larger than the other renderers and dominates the production build size.
- Interaction redraws go through `Plotly.react` on the whole figure; at this prototype's series count that is fine, but a production build with many more traces would likely move per-hover highlight and cursor updates to `Plotly.restyle`/`Plotly.relayout` for surgical updates.
- To honour the shared stack geometry and inspection model, Plotly's own stacking, hover/inspection, native legend, floating tooltip, and zoom/pan are all bypassed or disabled. What remains is a rendering backend (axes, grid, spikeline, antialiased fills) - much of what makes Plotly attractive is turned off to fit this project's rules.

### Overall assessment

A capable renderer, but for this project's brief it mostly acts as a rendering backend for geometry computed elsewhere - the same role visx fills, except visx is designed to be handed that geometry. To satisfy the fixed-geometry, docked-inspection model Plotly's stacking, hover, native legend, tooltip, and zoom/pan are all bypassed, so the exploratory strengths that justify its bundle weight (roughly doubling the production build) are largely unused. It would be the strong choice for a different brief - interactive, zoomable, export-ready exploratory charts - but here it fights the requirements about as much as it satisfies them.
