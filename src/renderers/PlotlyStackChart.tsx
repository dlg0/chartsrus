import { useEffect, useMemo, useRef, useState } from 'react'
import Plotly from 'plotly.js-basic-dist-min'
import type { Config, Data, Layout } from 'plotly.js'
import { netLineData, targetLineData } from '../chartDerivedData'
import { visibleYearTicks } from '../chartScales'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { bandRing } from '../plotlyBands'
import { nearestYearFromX, seriesValueExtent, signedBands, stackBySign, stackCellAtPoint, stackExtent, yearsFromSpec } from '../stackUtils'
import type { RendererProps } from '../types'

const ACTIVE_OPACITY = 0.85
const DIMMED_OPACITY = 0.18

// 24x24 filled glyphs for the custom modebar buttons (Material-style, y-down like SVG).
const FULLSCREEN_ICON = { width: 24, height: 24, path: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z' }
const TOOLTIP_ICON = { width: 24, height: 24, path: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' }
const LEGEND_ICON = { width: 24, height: 24, path: 'M3 6h4v2H3V6zm6 0h12v2H9V6zM3 11h4v2H3v-2zm6 0h12v2H9v-2zM3 16h4v2H3v-2zm6 0h12v2H9v-2z' }

// Plotly renderer. Like the Observable Plot version it embeds a non-React chart through a ref and
// drives the shared docked inspector from its own pointer maths (stable nearest-year + cell-at-point),
// while Plotly owns the rendering: diffed Plotly.react updates, native grid/axes, an x spikeline that
// tracks the cursor, uirevision to keep zoom, and custom modebar buttons. The explicit StackCell
// y0/y1 geometry stays the source of truth: each contiguous same-sign segment is one closed
// fill: 'toself' polygon, so sign-changing series keep one colour and never draw an area across zero.
export function PlotlyStackChart({ spec, chartType, viewMode, showNetLine, showTargets, width, height, inspection, setInspection }: RendererProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const readyRef = useRef(false)
  const [showNativeTooltip, setShowNativeTooltip] = useState(false)
  const [showNativeLegend, setShowNativeLegend] = useState(false)
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
  const minGap = years.slice(1).reduce((gap, year, index) => Math.min(gap, year - years[index]), Number.POSITIVE_INFINITY)
  const barWidth = Number.isFinite(minGap) ? minGap * 0.8 : 1

  const data = useMemo<Data[]>(() => {
    const opacityFor = (key: string) => (activeKey && activeKey !== key ? DIMMED_OPACITY : ACTIVE_OPACITY)
    // Tooltip on: a single closest-trace label (bands show their name, the net/target lines show a value).
    // x-unified over tiled bands showed a confusing transparent subset, so closest mode is used instead.
    // Off: no hover label at all - the docked inspector is the readout.
    const bandHoverProps = showNativeTooltip ? { hovertemplate: '%{fullData.name}<extra></extra>' } : { hoverinfo: 'none' as const }
    const overlayHoverProps = showNativeTooltip ? { hovertemplate: `%{fullData.name}: %{y:.0f} ${spec.unit}<extra></extra>` } : { hoverinfo: 'skip' as const }
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
          fill: 'toself',
          fillcolor: color,
          line: { color, width: 0.5 },
          opacity: opacityFor(band.key),
          ...bandHoverProps,
          legendgroup: band.key,
          name: band.shortLabel,
          showlegend: showNativeLegend && bands.findIndex((other) => other.key === band.key) === index,
        } as Data
      })
    }
    const buildBars = (): Data[] => spec.series
      .map((series) => ({ series, barCells: cells.filter((cell) => cell.key === series.key && !cell.isMissing && cell.sign !== 'zero') }))
      .filter(({ barCells }) => barCells.length > 0)
      .map(({ series, barCells }) => ({
        type: 'bar',
        x: barCells.map((cell) => cell.year),
        y: barCells.map((cell) => cell.y1 - cell.y0),
        base: barCells.map((cell) => cell.y0),
        width: barWidth,
        marker: { color: colorForKey(spec, series.key), line: { width: 0 } },
        opacity: opacityFor(series.key),
        ...bandHoverProps,
        legendgroup: series.key,
        name: series.shortLabel,
        showlegend: showNativeLegend,
        // base (the floating-bar origin) is a core Plotly bar attribute the bundled @types lag on, so
        // this trace is cast through unknown.
      }) as unknown as Data)
    // Lines plot each series' raw value (unstacked); nulls break the line rather than bridging gaps.
    const buildLines = (): Data[] => spec.series.map((series) => ({
      type: 'scatter',
      mode: 'lines',
      x: spec.data.map((row) => row.year),
      y: spec.data.map((row) => row[series.key]),
      line: { color: colorForKey(spec, series.key), width: 1.5, shape: spec.options.interpolation === 'step' ? 'hv' : 'linear' },
      opacity: opacityFor(series.key),
      ...bandHoverProps,
      legendgroup: series.key,
      name: series.shortLabel,
      showlegend: showNativeLegend,
      connectgaps: false,
    }) as Data)

    const seriesTraces: Data[] = chartType === 'area' ? buildAreas() : chartType === 'line' ? buildLines() : buildBars()

    const overlays: Data[] = [
      ...(showTargets ? [{ type: 'scatter', mode: 'lines', x: targets.map((point) => point.year), y: targets.map((point) => point.target), line: { color: '#7c3aed', width: 1.4, dash: 'dash' }, ...overlayHoverProps, name: 'NDC target', showlegend: showNativeLegend } as Data] : []),
      ...(showNetLine ? [{ type: 'scatter', mode: 'lines', x: net.map((point) => point.year), y: net.map((point) => point.net), line: { color: '#111827', width: 1.5 }, ...overlayHoverProps, name: 'Net balance', showlegend: showNativeLegend } as Data] : []),
    ]
    return [...seriesTraces, ...overlays]
  }, [activeKey, barWidth, cells, chartType, net, showNativeLegend, showNativeTooltip, showNetLine, showTargets, spec, targets])

  const layout = useMemo<Partial<Layout>>(() => {
    const shapes: NonNullable<Layout['shapes']> = [
      { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: 0, y1: 0, line: { color: '#697386', width: 1 }, layer: 'below' },
    ]
    if (inspection.pinnedYear != null) {
      shapes.push({ type: 'line', xref: 'x', x0: inspection.pinnedYear, x1: inspection.pinnedYear, yref: 'paper', y0: 0, y1: 1, line: { color: '#111827', width: 1, dash: 'dot' }, layer: 'above' })
    }
    return {
      width,
      height,
      margin: { t: tokens.chartMargin.top, r: tokens.chartMargin.right, b: tokens.chartMargin.bottom, l: tokens.chartMargin.left },
      font: { size: tokens.axisFontSize, color: '#52606d', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      showlegend: showNativeLegend,
      legend: { font: { size: tokens.axisFontSize }, groupclick: 'togglegroup' },
      // Lighter, less obtrusive modebar icons over the dense plot.
      modebar: { bgcolor: 'rgba(255,255,255,0)', color: '#b9c0cc', activecolor: '#5b6573' },
      // Solid label box so the optional tooltip is readable (the default was effectively transparent).
      hoverlabel: { bgcolor: '#ffffff', bordercolor: '#cbd3df', font: { size: tokens.axisFontSize, color: '#172033' } },
      // Tooltip on: a single closest-trace label. Off: 'x' just feeds the monotonic cursor spike (no label).
      hovermode: showNativeTooltip ? 'closest' : 'x',
      dragmode: 'zoom',
      barmode: 'overlay',
      // Keep pan/zoom and legend visibility toggles across data updates so hover redraws never reset them.
      uirevision: `${chartType}-${viewMode}-${showNetLine}-${showTargets}-${spec.series.length}-${spec.options.interpolation}-${spec.options.density}`,
      xaxis: {
        range: [Math.min(...years), Math.max(...years)],
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
        range: [yMin * 1.05, yMax * 1.05],
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
  }, [chartType, height, inspection.pinnedYear, showNativeLegend, showNativeTooltip, showNetLine, showTargets, spec.options.density, spec.options.interpolation, spec.series.length, tokens, viewMode, width, xTicks, yMax, yMin, years])

  const config = useMemo<Partial<Config>>(() => ({
    displaylogo: false,
    responsive: false,
    scrollZoom: false,
    displayModeBar: 'hover',
    // Spell out the modebar so the select-nearest (hoverClosestCartesian) toggle is guaranteed to appear
    // (Plotly was dropping it from the defaults); the PNG export is left out in favour of the card's own
    // save image / save full, along with the lasso/box-select and zoom-step noise.
    modeBarButtons: [
      ['zoom2d', 'pan2d', 'resetScale2d', 'hoverClosestCartesian'],
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
          name: 'toggle-tooltip',
          title: 'Toggle the Plotly hover tooltip',
          icon: TOOLTIP_ICON,
          click: () => setShowNativeTooltip((value) => !value),
        },
        {
          name: 'toggle-legend',
          title: 'Toggle the Plotly legend (click to hide a series, double-click to isolate one)',
          icon: LEGEND_ICON,
          click: () => setShowNativeLegend((value) => !value),
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

  // Inspection runs off our own pointer maths (nearest scaled year, then cell-at-point), matching the
  // other renderers, so the docked inspector and highlight stay stable and never chase polygon vertices.
  function inspect(clientX: number, clientY: number, rect: DOMRect) {
    const innerLeft = tokens.chartMargin.left
    const innerRight = width - tokens.chartMargin.right
    const innerTop = tokens.chartMargin.top
    const innerBottom = height - tokens.chartMargin.bottom
    const domainMin = Math.min(...years)
    const domainMax = Math.max(...years)
    const xScale = (year: number) => innerLeft + ((year - domainMin) / (domainMax - domainMin)) * (innerRight - innerLeft)
    const paddedMin = yMin * 1.05
    const paddedMax = yMax * 1.05
    const yScale = (value: number) => innerBottom - ((value - paddedMin) / (paddedMax - paddedMin)) * (innerBottom - innerTop)
    const year = nearestYearFromX(clientX - rect.left, years, xScale)
    const cell = stackCellAtPoint(cells, year, clientY - rect.top, yScale)
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
