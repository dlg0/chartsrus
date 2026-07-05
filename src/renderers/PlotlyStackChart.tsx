import { useEffect, useMemo, useRef, useState } from 'react'
import Plotly from 'plotly.js-basic-dist-min'
import type { Config, Data, Layout } from 'plotly.js'
import { counterfactualCells, counterfactualExtent, counterfactualLineData, lineExtent, netLineData, targetLineData } from '../chartDerivedData'
import type { CounterfactualCell } from '../chartDerivedData'
import { barXBands, barXDomain, visibleYearTicks } from '../chartScales'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { bandRing } from '../plotlyBands'
import { nearestYearFromX, seriesValueExtent, signedBands, stackBySign, stackCellAtPoint, stackExtent, yearsFromSpec } from '../stackUtils'
import type { RendererProps } from '../types'

const ACTIVE_OPACITY = 0.85
const DIMMED_OPACITY = 0.18
// Extra margin reserved for the native legend when it is docked right/bottom, so it never overlaps
// the plot area (Plotly does not auto-grow margins for a fixed-size figure).
const LEGEND_RIGHT_WIDTH = 130
const LEGEND_BOTTOM_ROW_HEIGHT = 14

type LegendMode = 'off' | 'right' | 'bottom'
const NEXT_LEGEND_MODE: Record<LegendMode, LegendMode> = { off: 'right', right: 'bottom', bottom: 'off' }

// 24x24 filled glyphs for the custom modebar buttons (Material-style, y-down like SVG).
const FULLSCREEN_ICON = { width: 24, height: 24, path: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z' }
const TOOLTIP_ICON = { width: 24, height: 24, path: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' }
const LEGEND_ICON = { width: 24, height: 24, path: 'M3 6h4v2H3V6zm6 0h12v2H9V6zM3 11h4v2H3v-2zm6 0h12v2H9v-2zM3 16h4v2H3v-2zm6 0h12v2H9v-2z' }
const TOOLS_ICON = { width: 24, height: 24, path: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z' }
const CAMERA_ICON = { width: 24, height: 24, path: 'M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zM9 2l-1.83 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z' }
const CAMERA_FULL_ICON = { width: 24, height: 24, path: 'M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z' }

// Plotly renderer. Like the Observable Plot version it embeds a non-React chart through a ref and
// drives the shared docked inspector from its own pointer maths (stable nearest-year + cell-at-point),
// while Plotly owns the rendering: diffed Plotly.react updates, native grid/axes, an x spikeline that
// tracks the cursor, uirevision to keep UI toggles across redraws, and custom modebar buttons. The explicit StackCell
// y0/y1 geometry stays the source of truth: each contiguous same-sign segment is one closed
// fill: 'toself' polygon, so sign-changing series keep one colour and never draw an area across zero.
export function PlotlyStackChart({ spec, chartKind, chartType, viewMode, showNetLine, showTargets, width, height, inspection, setInspection }: RendererProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const readyRef = useRef(false)
  const [showNativeTooltip, setShowNativeTooltip] = useState(false)
  const [legendMode, setLegendMode] = useState<LegendMode>('off')
  const tokens = densityTokens[spec.options.density]
  const cells = useMemo(() => stackBySign(spec.data, spec.series), [spec])
  const years = useMemo(() => yearsFromSpec(spec), [spec])
  const xTicks = useMemo(() => visibleYearTicks(years, width), [width, years])
  const net = useMemo(() => netLineData(spec.data, spec.series), [spec])
  const targets = useMemo(() => targetLineData(years, viewMode), [viewMode, years])
  const [stackMin, stackMax] = stackExtent(cells)
  const [valueMin, valueMax] = seriesValueExtent(spec.data, spec.series)
  const overlayValues = [
    ...(showNetLine ? net.map((point) => point.net) : []),
    ...(showTargets ? targets.map((point) => point.target) : []),
  ]
  // Lines plot each series' own value, so they need the per-series extent, not the stacked extent.
  const yMin = Math.min(chartType === 'line' ? valueMin : stackMin, ...overlayValues)
  const yMax = Math.max(chartType === 'line' ? valueMax : stackMax, ...overlayValues)
  const activeKey = inspection.activeSeriesKey
  const legendVisible = legendMode !== 'off'
  const lineDomain = lineExtent(spec.data, spec.series)
  const wedgeLines = useMemo(() => counterfactualLineData(spec.data, spec.series), [spec])
  const wedgeCells = useMemo(() => counterfactualCells(spec.data, spec.series), [spec])
  const wedgeDomain = counterfactualExtent(wedgeCells, wedgeLines)
  const selectedYear = inspection.pinnedYear ?? inspection.activeYear
  // Active data point for the horizontal crosshair shape: the series under the pointer. y is the raw
  // value on a line chart, otherwise the mid of its stack/wedge cell. Only drawn while a series is active.
  const activeStackCell = activeKey != null && selectedYear != null ? cells.find((cell) => cell.key === activeKey && cell.year === selectedYear && !cell.isMissing && cell.sign !== 'zero') : undefined
  const activeWedgeCell = activeKey != null && selectedYear != null ? wedgeCells.find((cell) => cell.key === activeKey && cell.year === selectedYear && !cell.isMissing && cell.sign !== 'zero') : undefined
  const activeLineRow = activeKey != null && selectedYear != null ? spec.data.find((row) => row.year === selectedYear) : undefined
  const activeLineValue = activeLineRow && activeKey != null ? activeLineRow[activeKey] : null
  const crossY = chartKind === 'line'
    ? activeLineValue
    : chartKind === 'counterfactual'
      ? (activeWedgeCell ? (activeWedgeCell.y0 + activeWedgeCell.y1) / 2 : null)
      : chartType === 'line' ? activeLineValue : (activeStackCell ? (activeStackCell.y0 + activeStackCell.y1) / 2 : null)
  const barBands = useMemo(() => barXBands(years), [years])
  const barBandByYear = useMemo(() => new Map(barBands.map((band) => [band.year, band])), [barBands])
  const usesBarDomain = chartType === 'bar' && chartKind !== 'line'
  const xDomain: [number, number] = usesBarDomain ? barXDomain(years) : [Math.min(...years), Math.max(...years)]
  // Padded y range per chart kind, shared by the layout and the pointer maths so inspection stays exact.
  const [plotYMin, plotYMax]: [number, number] = chartKind === 'line'
    ? [lineDomain[0] * 1.08, lineDomain[1] * 1.08]
    : chartKind === 'counterfactual'
      ? [wedgeDomain[0] * 1.08, wedgeDomain[1] * 1.08]
      : [yMin * 1.05, yMax * 1.05]
  // Legend rows below the plot need real margin space in a fixed-size figure.
  const legendEntryCount = spec.series.length + (showNetLine ? 1 : 0) + (showTargets ? 1 : 0)
  const legendBottomRows = Math.max(1, Math.ceil(legendEntryCount / Math.max(1, Math.floor(width / 110))))
  const marginRight = tokens.chartMargin.right + (legendMode === 'right' ? LEGEND_RIGHT_WIDTH : 0)
  const marginBottom = tokens.chartMargin.bottom + (legendMode === 'bottom' ? legendBottomRows * LEGEND_BOTTOM_ROW_HEIGHT + 6 : 0)

  const data = useMemo<Data[]>(() => {
    const opacityFor = (key: string) => (activeKey && activeKey !== key ? DIMMED_OPACITY : ACTIVE_OPACITY)
    // Tooltip on: every trace shows "name: value". Bars, lines and the net/target lines read the value
    // straight from %{y}; area bands can't (their y is a ring coordinate), so the per-year value rides in
    // customdata. Off: no hover label - the docked inspector is the readout.
    const off = { hoverinfo: 'none' as const }
    const valueTemplate = `%{fullData.name}: %{y:.0f} ${spec.unit}<extra></extra>`
    const customTemplate = `%{fullData.name}: %{customdata:.0f} ${spec.unit}<extra></extra>`
    const valueHoverProps = showNativeTooltip ? { hovertemplate: valueTemplate } : off
    const areaHoverProps = showNativeTooltip ? { hovertemplate: customTemplate } : off
    const overlayHoverProps = showNativeTooltip ? { hovertemplate: valueTemplate } : { hoverinfo: 'skip' as const }
    const bandFor = (year: number) => barBandByYear.get(year)
    // Full-width tapered bands tile without the triangular gaps that per-segment polygons leave at
    // sign changes; one legend entry per series (the first band) drives the grouped legend toggle.
    const buildAreas = (): Data[] => {
      const bands = signedBands(spec.data, spec.series)
      return bands.map((band, index) => {
        const color = colorForKey(spec, band.key)
        const ring = bandRing(band.points, spec.options.interpolation)
        return {
          type: 'scatter',
          mode: 'lines',
          x: ring.x,
          y: ring.y,
          customdata: ring.custom,
          fill: 'toself',
          fillcolor: color,
          line: { color, width: 0.5 },
          opacity: opacityFor(band.key),
          ...areaHoverProps,
          legendgroup: band.key,
          name: band.shortLabel,
          showlegend: legendVisible && bands.findIndex((other) => other.key === band.key) === index,
        } as Data
      })
    }
    // Bars span the year's band (midpoint-to-midpoint of neighbouring years) so irregular spacing
    // reads as continuous time, matching the other renderers' variable-width bars.
    const buildBars = (): Data[] => spec.series
      .map((series) => ({ series, barCells: cells.filter((cell) => cell.key === series.key && !cell.isMissing && cell.sign !== 'zero') }))
      .filter(({ barCells }) => barCells.length > 0)
      .map(({ series, barCells }) => ({
        type: 'bar',
        x: barCells.map((cell) => { const band = bandFor(cell.year); return band ? (band.x0 + band.x1) / 2 : cell.year }),
        y: barCells.map((cell) => cell.y1 - cell.y0),
        base: barCells.map((cell) => cell.y0),
        width: barCells.map((cell) => { const band = bandFor(cell.year); return band ? band.x1 - band.x0 : 1 }),
        marker: { color: colorForKey(spec, series.key), line: { width: 0 } },
        opacity: opacityFor(series.key),
        ...valueHoverProps,
        legendgroup: series.key,
        name: series.shortLabel,
        showlegend: legendVisible,
        // base (the floating-bar origin) is a core Plotly bar attribute the bundled @types lag on, so
        // this trace is cast through unknown.
      }) as unknown as Data)
    // Lines plot each series' raw value (unstacked); nulls break the line rather than bridging gaps.
    const buildLines = (emphasis: boolean): Data[] => spec.series.map((series) => ({
      type: 'scatter',
      mode: 'lines',
      x: spec.data.map((row) => row.year),
      y: spec.data.map((row) => row[series.key]),
      line: {
        color: colorForKey(spec, series.key),
        width: emphasis && activeKey === series.key ? 2.5 : emphasis ? 1.6 : 1.5,
        shape: spec.options.interpolation === 'step' ? 'hv' : 'linear',
      },
      opacity: activeKey && activeKey !== series.key ? (emphasis ? 0.2 : DIMMED_OPACITY) : (emphasis ? 1 : ACTIVE_OPACITY),
      ...valueHoverProps,
      legendgroup: series.key,
      name: series.shortLabel,
      showlegend: legendVisible,
      connectgaps: false,
    }) as Data)

    // Counterfactual wedge: grey+hashed factual underlay, per-series contribution bands stacked off
    // the counterfactual baseline, and the counterfactual/factual reference lines on top.
    const buildWedge = (): Data[] => {
      const factualPoints = wedgeLines.filter((point) => point.factual != null)
      const underlay: Data[] = chartType === 'area'
        ? [
          { type: 'scatter', mode: 'lines', x: factualPoints.map((point) => point.year), y: factualPoints.map((point) => point.factual), fill: 'tozeroy', fillcolor: 'rgba(100,116,139,0.1)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false } as Data,
          { type: 'scatter', mode: 'lines', x: factualPoints.map((point) => point.year), y: factualPoints.map((point) => point.factual), fill: 'tozeroy', fillpattern: { shape: '/', bgcolor: 'rgba(0,0,0,0)', fgcolor: '#475569', fgopacity: 0.4, size: 8, solidity: 0.18 }, line: { width: 0 }, hoverinfo: 'skip', showlegend: false } as unknown as Data,
        ]
        : [
          { type: 'bar', x: factualPoints.map((point) => { const band = bandFor(point.year); return band ? (band.x0 + band.x1) / 2 : point.year }), y: factualPoints.map((point) => point.factual ?? 0), base: factualPoints.map(() => 0), width: factualPoints.map((point) => { const band = bandFor(point.year); return band ? band.x1 - band.x0 : 1 }), marker: { color: 'rgba(100,116,139,0.08)', line: { color: 'rgba(148,163,184,0.18)', width: 1 } }, hoverinfo: 'skip', showlegend: false } as unknown as Data,
          { type: 'bar', x: factualPoints.map((point) => { const band = bandFor(point.year); return band ? (band.x0 + band.x1) / 2 : point.year }), y: factualPoints.map((point) => point.factual ?? 0), base: factualPoints.map(() => 0), width: factualPoints.map((point) => { const band = bandFor(point.year); return band ? band.x1 - band.x0 : 1 }), marker: { color: 'rgba(0,0,0,0)', pattern: { shape: '/', bgcolor: 'rgba(0,0,0,0)', fgcolor: '#475569', fgopacity: 0.4, size: 8, solidity: 0.18 }, line: { width: 0 } }, hoverinfo: 'skip', showlegend: false } as unknown as Data,
        ]

      const contributions: Data[] = chartType === 'area'
        ? spec.series.flatMap((series) => (['positive', 'negative'] as const).map((sign, signIndex) => {
          const segment = wedgeCells.filter((cell) => cell.key === series.key && !cell.isMissing && cell.sign === sign)
          if (segment.length === 0) return null
          const color = colorForKey(spec, series.key)
          const forward = segment
          const backward = [...segment].reverse()
          return {
            type: 'scatter',
            mode: 'lines',
            x: [...forward.map((cell) => cell.year), ...backward.map((cell) => cell.year)],
            y: [...forward.map((cell) => cell.y1), ...backward.map((cell) => cell.y0)],
            customdata: [...forward.map((cell) => cell.value), ...backward.map((cell) => cell.value)],
            fill: 'toself',
            fillcolor: color,
            line: { color, width: 0.5 },
            opacity: activeKey && activeKey !== series.key ? DIMMED_OPACITY : 0.76,
            ...areaHoverProps,
            legendgroup: series.key,
            name: series.shortLabel,
            showlegend: legendVisible && signIndex === 0,
          } as Data
        }).filter((trace): trace is Data => trace != null))
        : spec.series
          .map((series) => ({ series, barCells: wedgeCells.filter((cell) => cell.key === series.key && !cell.isMissing && cell.sign !== 'zero') }))
          .filter(({ barCells }) => barCells.length > 0)
          .map(({ series, barCells }) => ({
            type: 'bar',
            x: barCells.map((cell) => { const band = bandFor(cell.year); return band ? (band.x0 + band.x1) / 2 : cell.year }),
            y: barCells.map((cell) => cell.y1 - cell.y0),
            base: barCells.map((cell) => cell.y0),
            width: barCells.map((cell) => { const band = bandFor(cell.year); return band ? band.x1 - band.x0 : 1 }),
            marker: { color: colorForKey(spec, series.key), line: { width: 0 } },
            opacity: activeKey && activeKey !== series.key ? DIMMED_OPACITY : 0.82,
            ...(showNativeTooltip ? { hovertemplate: customTemplate } : off),
            customdata: barCells.map((cell) => cell.value),
            legendgroup: series.key,
            name: series.shortLabel,
            showlegend: legendVisible,
          }) as unknown as Data)

      const referenceLines: Data[] = [
        { type: 'scatter', mode: 'lines', x: wedgeLines.map((point) => point.year), y: wedgeLines.map((point) => point.counterfactual), line: { color: '#0f172a', width: 3, dash: '6px,4px' }, ...overlayHoverProps, name: 'Counterfactual', showlegend: legendVisible, connectgaps: false } as unknown as Data,
        { type: 'scatter', mode: 'lines', x: wedgeLines.map((point) => point.year), y: wedgeLines.map((point) => point.factual), line: { color: '#dc2626', width: 3.2 }, ...overlayHoverProps, name: 'Factual', showlegend: legendVisible, connectgaps: false } as Data,
      ]
      return [...underlay, ...contributions, ...referenceLines]
    }

    if (chartKind === 'line') return buildLines(true)
    if (chartKind === 'counterfactual') return buildWedge()

    const seriesTraces: Data[] = chartType === 'area' ? buildAreas() : chartType === 'line' ? buildLines(false) : buildBars()

    const overlays: Data[] = [
      ...(showTargets ? [{ type: 'scatter', mode: 'lines', x: targets.map((point) => point.year), y: targets.map((point) => point.target), line: { color: '#7c3aed', width: 1.4, dash: 'dash' }, ...overlayHoverProps, name: 'NDC target', showlegend: legendVisible } as Data] : []),
      ...(showNetLine ? [{ type: 'scatter', mode: 'lines', x: net.map((point) => point.year), y: net.map((point) => point.net), line: { color: '#111827', width: 1.5 }, ...overlayHoverProps, name: 'Net balance', showlegend: legendVisible } as Data] : []),
    ]
    return [...seriesTraces, ...overlays]
  }, [activeKey, barBandByYear, cells, chartKind, chartType, legendVisible, net, showNativeTooltip, showNetLine, showTargets, spec, targets, wedgeCells, wedgeLines])

  const layout = useMemo<Partial<Layout>>(() => {
    const shapes: NonNullable<Layout['shapes']> = [
      { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: 0, y1: 0, line: { color: '#697386', width: 1 }, layer: 'below' },
    ]
    if (inspection.pinnedYear != null) {
      shapes.push({ type: 'line', xref: 'x', x0: inspection.pinnedYear, x1: inspection.pinnedYear, yref: 'paper', y0: 0, y1: 1, line: { color: '#111827', width: 1, dash: 'dot' }, layer: 'above' })
    }
    // Horizontal dotted crosshair at the active point's y, matching the vertical year line.
    if (crossY != null) {
      shapes.push({ type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: crossY, y1: crossY, line: { color: '#111827', width: 1, dash: 'dot' }, layer: 'above' })
    }
    // Compact legend: every series is its own legendgroup, so the default 10px tracegroupgap is what
    // spreads entries out - zero it and use constant-size symbols. Docked right it sits in reserved
    // right margin; docked bottom it flows horizontally in reserved bottom margin (container-relative
    // so it hugs the figure edge, not the axis).
    const legendBase = { font: { size: tokens.axisFontSize }, groupclick: 'togglegroup' as const, tracegroupgap: 0, itemwidth: 30, itemsizing: 'constant' as const }
    const legend = legendMode === 'bottom'
      ? { ...legendBase, orientation: 'h' as const, x: 0, xanchor: 'left' as const, yref: 'container', y: 0.01, yanchor: 'bottom' as const }
      : { ...legendBase, orientation: 'v' as const, xref: 'container', x: 0.995, xanchor: 'right' as const, y: 1, yanchor: 'top' as const }
    return {
      width,
      height,
      margin: { t: tokens.chartMargin.top, r: marginRight, b: marginBottom, l: tokens.chartMargin.left },
      font: { size: tokens.axisFontSize, color: '#52606d', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      showlegend: legendVisible,
      // container-relative legend refs are newer than the bundled @types, so the object is cast.
      legend: legend as Layout['legend'],
      // Lighter, less obtrusive modebar icons over the dense plot, on a faint backing so the cursor line
      // behind them does not bleed through.
      modebar: { bgcolor: 'rgba(255,255,255,0.85)', color: '#b9c0cc', activecolor: '#5b6573' },
      // Solid label box so the optional tooltip is readable (the default was effectively transparent).
      hoverlabel: { bgcolor: '#ffffff', bordercolor: '#cbd3df', font: { size: tokens.axisFontSize, color: '#172033' } },
      // Default to a single closest-trace tooltip; the modebar's show-nearest/show-all buttons switch this
      // and uirevision keeps the choice. Whether a label shows is gated by hovertemplate/hoverinfo, not here.
      hovermode: 'closest',
      // Drag-zoom/pan is disabled: the shared docked inspector runs off our own pointer maths against the
      // static data-derived domain, so a zoomed/panned axis would silently desync inspection. This is a
      // real Plotly friction point for the fixed-geometry model (see docs/comparison-notes.md).
      dragmode: false,
      barmode: 'overlay',
      // Keep hover-mode and legend visibility toggles across data updates so hover redraws never reset them.
      uirevision: `${chartKind}-${chartType}-${viewMode}-${showNetLine}-${showTargets}-${spec.series.length}-${spec.options.interpolation}-${spec.options.density}`,
      xaxis: {
        range: xDomain,
        tickvals: xTicks,
        tickformat: 'd',
        showgrid: false,
        zeroline: false,
        showline: true,
        linecolor: '#c6ccd6',
        ticks: 'outside',
        tickcolor: '#c6ccd6',
        ticklen: 3,
        // Cursor spike is the live cursor in both modes; spikesnap 'cursor' makes it follow the mouse.
        showspikes: true,
        spikemode: 'across',
        spikethickness: 1,
        spikecolor: '#94a3b8',
        spikedash: 'solid',
        spikesnap: 'cursor',
      },
      yaxis: {
        range: [plotYMin, plotYMax],
        nticks: 5,
        showgrid: true,
        gridcolor: '#e7eaf0',
        zeroline: false,
        ticks: 'outside',
        tickcolor: '#c6ccd6',
        ticklen: 3,
      },
      shapes,
    }
  }, [chartKind, chartType, crossY, height, inspection.pinnedYear, legendMode, legendVisible, marginBottom, marginRight, plotYMax, plotYMin, showNetLine, showTargets, spec.options.density, spec.options.interpolation, spec.series.length, tokens, viewMode, width, xDomain, xTicks])

  const config = useMemo<Partial<Config>>(() => ({
    displaylogo: false,
    responsive: false,
    scrollZoom: false,
    displayModeBar: 'hover',
    // Spell out the modebar so the show-nearest (hoverClosestCartesian) and show-all (hoverCompareCartesian)
    // hover toggles are guaranteed to appear (Plotly was dropping them from the defaults); the PNG export is
    // left out in favour of the card's own save image / save full, along with the lasso/box-select noise.
    // zoom/pan/reset are omitted deliberately: the shared inspector's pointer maths assume the static
    // domain, so an interactive range change would desync inspection.
    modeBarButtons: [
      ['hoverClosestCartesian', 'hoverCompareCartesian'],
      [
        {
          name: 'fullscreen',
          title: 'Full screen (keeps the full legend and inspector visible)',
          icon: FULLSCREEN_ICON,
          click: (gd: HTMLElement) => {
            const card = gd.closest('.chart-card')
            if (document.fullscreenElement) void document.exitFullscreen()
            else if (card instanceof HTMLElement) void card.requestFullscreen().catch(() => {})
          },
        },
        {
          name: 'tools',
          title: 'Tools (mode, net line, NDC overlay, export)',
          icon: TOOLS_ICON,
          click: (gd: HTMLElement) => gd.closest('.chart-card')?.dispatchEvent(new CustomEvent('chart-tools-toggle', { bubbles: true })),
        },
        {
          name: 'toggle-tooltip',
          title: 'Toggle the Plotly hover tooltip',
          icon: TOOLTIP_ICON,
          click: () => setShowNativeTooltip((value) => !value),
        },
        {
          name: 'toggle-legend',
          title: 'Legend: click cycles hidden, right, bottom (click an entry to hide a series, double-click to isolate)',
          icon: LEGEND_ICON,
          click: () => setLegendMode((mode) => NEXT_LEGEND_MODE[mode]),
        },
        {
          name: 'save-image',
          title: 'Save image (compact view)',
          icon: CAMERA_ICON,
          click: (gd: HTMLElement) => gd.closest('.chart-card')?.dispatchEvent(new CustomEvent('chart-save-image', { bubbles: true })),
        },
        {
          name: 'save-full',
          title: 'Save full image (every legend item and inspector row)',
          icon: CAMERA_FULL_ICON,
          click: (gd: HTMLElement) => gd.closest('.chart-card')?.dispatchEvent(new CustomEvent('chart-save-full', { bubbles: true })),
        },
      ],
    ],
  }), [])

  // Diff the figure in place on every change; readyRef flips true once a draw has resolved so teardown
  // knows a real plot exists. Rejections are swallowed because a StrictMode/reset remount can purge a
  // graph mid-draw.
  useEffect(() => {
    const el = ref.current
    if (el) void Plotly.react(el, data, layout, config).then(() => { readyRef.current = true }).catch(() => {})
  }, [data, layout, config])

  // Purge only on unmount, and only once a draw has resolved, so a remount cannot tear down mid-draw.
  useEffect(() => {
    const el = ref.current
    return () => { if (el && readyRef.current) { try { Plotly.purge(el) } catch { /* already torn down */ } } }
  }, [])

  // Inspection runs off our own pointer maths (nearest scaled year, then cell/series-at-point per chart
  // kind), matching the other renderers, so the docked inspector and highlight stay stable and never
  // chase polygon vertices. The scales mirror the layout's margins and padded ranges exactly.
  function inspect(clientX: number, clientY: number, rect: DOMRect) {
    const innerLeft = tokens.chartMargin.left
    const innerRight = width - marginRight
    const innerTop = tokens.chartMargin.top
    const innerBottom = height - marginBottom
    const xScale = (year: number) => innerLeft + ((year - xDomain[0]) / (xDomain[1] - xDomain[0])) * (innerRight - innerLeft)
    const yScale = (value: number) => innerBottom - ((value - plotYMin) / (plotYMax - plotYMin)) * (innerBottom - innerTop)
    const year = nearestYearFromX(clientX - rect.left, years, xScale)
    const y = clientY - rect.top

    if (chartKind === 'line') {
      const row = spec.data.find((point) => point.year === year)
      const active = row == null ? null : spec.series.reduce<string | null>((nearest, series) => {
        const value = row[series.key]
        if (value == null) return nearest
        if (nearest == null) return series.key
        return Math.abs(yScale(value) - y) < Math.abs(yScale(row[nearest] ?? 0) - y) ? series.key : nearest
      }, null)
      setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: active }))
      return
    }

    if (chartKind === 'counterfactual') {
      const cell = wedgeCells.find((item: CounterfactualCell) => item.year === year && !item.isMissing && item.sign !== 'zero' && y >= Math.min(yScale(item.y0), yScale(item.y1)) && y <= Math.max(yScale(item.y0), yScale(item.y1)))
      setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
      return
    }

    const cell = stackCellAtPoint(cells, year, y, yScale)
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
  }

  return (
    <div
      className="plotly-wrap"
      ref={ref}
      onPointerMove={(event) => inspect(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())}
      onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))}
      onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))}
    />
  )
}
