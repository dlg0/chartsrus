# Chart renderer comparison notes

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
- Sign-changing series are rendered as contiguous same-sign segments, stacked nearest zero, with one logical colour.

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
- Sign-changing series are stacked nearest zero, split into positive and negative rendered segments, and preserve one logical series identity and colour for legend and inspection.
- Pointer hit-testing is a transparent overlay using nearest scaled year.

### What was awkward

- More code than Recharts or Observable Plot.
- Visual polish and accessibility require explicit implementation rather than library defaults.

### Known limitations

- The prototype is intentionally compact and not fully production-hardened for export, animation, or very large datasets.
- Area segmentation is simple; production code may want more deliberate treatment of interpolated zero crossings and gaps.

### Overall assessment

Most work, most control. Likely the best long-term fit if charting is central product infrastructure and exact geometry/interaction semantics matter.

## Plotly

### What worked

- `Plotly.react` diffs data and layout in place, so updates do not remove/recreate the chart the way the Observable Plot wrapper does.
- `uirevision` preserves user zoom and pan across data updates, so hover-driven redraws never reset the view; toggling mode, overlays, density, or series count intentionally changes the revision key and resets the range.
- Explicit `StackCell` y0/y1 geometry stays the source of truth: each contiguous same-sign segment is one closed `fill: "toself"` polygon, so sign-changing series keep one logical colour and never connect a misleading area across zero. Bars reuse the same geometry through the native `base` (floating-bar) attribute.
- Native numeric axis, gridlines, and an x spikeline that tracks the cursor (`hovermode: "x"`, `spikesnap: "cursor"`) cover the irregular model years and the live cursor with very little code.
- A curated modebar adds genuinely useful native interactivity that does not fight the layout: box zoom, pan, reset, a 3x PNG export, and three custom buttons - full screen (which expands the whole card with its full legend and inspector), and toggles for the native Plotly tooltip and the native Plotly legend - with the logo and irrelevant lasso/select tools removed.
- The optional native legend groups each logical series under one `legendgroup` entry, so a legend click hides the whole series (`groupclick: "togglegroup"`) and a double-click isolates it, the standard Plotly behaviour, without splitting on the positive/negative render segments.
- Visual output is polished by default (antialiased fills, crisp axes) and integrates with the card-level `html-to-image` export as well as Plotly's own `toImage`.

### What was awkward

- Like Observable Plot, the chart is embedded imperatively through a ref and effects rather than as declarative React children.
- Plotly's defaults assume Plotly owns the legend and a floating hover label. Both are off by default so the shared compact legend and docked inspector stay the single legend/inspection system, but each can be switched on from the modebar to show the native behaviour.
- An earlier version drove inspection from Plotly's `hovermode: "closest"` events, but with `fill: "toself"` polygons the nearest point is the nearest ring vertex, so the cursor jumped erratically. Inspection now uses the renderer's own pointer maths (nearest scaled year, then cell-at-pointer), the same approach as the visx and Recharts versions, and Plotly only draws the cursor spike and the optional native tooltip.
- The bundled `@types/plotly.js` lag the runtime on the `base` (floating-bar) attribute, so one typed cast is needed.

### Known limitations

- Bundle weight is the real cost: even the partial `plotly.js-basic-dist-min` bundle is far larger than the other renderers and dominates the production build size.
- Interaction redraws go through `Plotly.react` on the whole figure; at this prototype's series count that is fine, but a production build with many more traces would likely move per-hover highlight and cursor updates to `Plotly.restyle`/`Plotly.relayout` for surgical updates.
- Enabling zoom/pan means the plotting box can change range on interaction; the prototype keeps a stable default view via the reset control and `uirevision` rather than locking the axes.

### Overall assessment

A strong middle option: less code than visx for axes, grid, cursor, zoom, and export, while still honouring the explicit shared stack geometry and the docked inspection model. The main trade-offs are bundle size and an imperative React wrapper. A good fit when polished, interactive, export-ready charts matter more than minimal bundle size.
