import { useEffect, useMemo, useRef } from 'react'
import Plotly from 'plotly.js-basic-dist-min'
import type { Config, Data, Layout, PlotMouseEvent, PlotlyHTMLElement } from 'plotly.js'
import { netLineData, targetLineData } from '../chartDerivedData'
import { visibleYearTicks } from '../chartScales'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { bandRing } from '../plotlyBands'
import { contiguousSignSegments, stackBySign, stackExtent, yearsFromSpec } from '../stackUtils'
import type { RendererProps } from '../types'

const ACTIVE_OPACITY = 0.85
const DIMMED_OPACITY = 0.18

// Plotly renderer. Like the Observable Plot version it embeds a non-React chart through a ref,
// but it leans on Plotly.react for diffed updates, native axes/grid/spikeline, uirevision to keep
// user zoom across updates, and Plotly's event stream to drive the shared docked inspector. The
// explicit StackCell y0/y1 geometry stays the source of truth: each contiguous same-sign segment
// is one closed fill: 'toself' polygon, so sign-changing series keep one colour and never draw a
// misleading area across zero.
export function PlotlyStackChart({ spec, chartType, viewMode, showNetLine, showTargets, width, height, inspection, setInspection }: RendererProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const readyRef = useRef(false)
  const tokens = densityTokens[spec.options.density]
  const cells = useMemo(() => stackBySign(spec.data, spec.series), [spec])
  const years = useMemo(() => yearsFromSpec(spec), [spec])
  const yearsRef = useRef(years)
  yearsRef.current = years
  const xTicks = useMemo(() => visibleYearTicks(years, width), [width, years])
  const net = useMemo(() => netLineData(spec.data, spec.series), [spec])
  const targets = useMemo(() => targetLineData(years, viewMode), [viewMode, years])
  const [stackMin, stackMax] = stackExtent(cells)
  const overlayValues = [
    ...(showNetLine ? net.map((point) => point.net) : []),
    ...(showTargets ? targets.map((point) => point.target) : []),
  ]
  const yMin = Math.min(stackMin, ...overlayValues)
  const yMax = Math.max(stackMax, ...overlayValues)
  const activeKey = inspection.activeSeriesKey
  const minGap = years.slice(1).reduce((gap, year, index) => Math.min(gap, year - years[index]), Number.POSITIVE_INFINITY)
  const barWidth = Number.isFinite(minGap) ? minGap * 0.8 : 1

  const data = useMemo<Data[]>(() => {
    const opacityFor = (key: string) => (activeKey && activeKey !== key ? DIMMED_OPACITY : ACTIVE_OPACITY)
    const seriesTraces: Data[] = chartType === 'area'
      ? spec.series.flatMap((series) => {
        const color = colorForKey(spec, series.key)
        const seriesCells = cells.filter((cell) => cell.key === series.key)
        return (['positive', 'negative'] as const).flatMap((sign) => contiguousSignSegments(seriesCells, sign).map((segment) => {
          const ring = bandRing(segment, spec.options.interpolation)
          return {
            type: 'scatter',
            mode: 'lines',
            x: ring.x,
            y: ring.y,
            fill: 'toself',
            fillcolor: color,
            line: { color, width: 0.5 },
            opacity: opacityFor(series.key),
            hoverinfo: 'none',
            meta: series.key,
            name: series.shortLabel,
            showlegend: false,
            // meta carries the series key for hit-testing in hover events; the bundled @types lag on it.
          } as Data
        }))
      })
      : spec.series
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
          hoverinfo: 'none',
          meta: series.key,
          name: series.shortLabel,
          showlegend: false,
          // base (the floating-bar origin) is a core Plotly bar attribute the bundled @types lag on.
        }) as Data)

    const overlays: Data[] = [
      ...(showTargets ? [{ type: 'scatter', mode: 'lines', x: targets.map((point) => point.year), y: targets.map((point) => point.target), line: { color: '#7c3aed', width: 1.4, dash: 'dash' }, hoverinfo: 'skip', name: 'NDC target', showlegend: false } satisfies Data] : []),
      ...(showNetLine ? [{ type: 'scatter', mode: 'lines', x: net.map((point) => point.year), y: net.map((point) => point.net), line: { color: '#111827', width: 1.5 }, hoverinfo: 'skip', name: 'Net balance', showlegend: false } satisfies Data] : []),
    ]
    return [...seriesTraces, ...overlays]
  }, [activeKey, barWidth, cells, chartType, net, showNetLine, showTargets, spec, targets])

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
      showlegend: false,
      hovermode: 'closest',
      dragmode: 'pan',
      barmode: 'overlay',
      // Keep pan/zoom state across data updates so hover-driven redraws never reset the view.
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
        showspikes: true,
        spikemode: 'across',
        spikethickness: 1,
        spikecolor: '#94a3b8',
        spikedash: 'solid',
        spikesnap: 'data',
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
  }, [chartType, height, inspection.pinnedYear, showNetLine, showTargets, spec.options.density, spec.options.interpolation, spec.series.length, tokens, viewMode, width, xTicks, yMax, yMin, years])

  const config = useMemo<Partial<Config>>(() => ({
    displaylogo: false,
    responsive: false,
    scrollZoom: false,
    displayModeBar: 'hover',
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
    toImageButtonOptions: { format: 'png', filename: 'plotly-emissions-stack', scale: 3 },
  }), [])

  // Diff the figure in place on every change; readyRef flips true once a draw has resolved so teardown
  // knows a real plot exists. Rejections are swallowed because a StrictMode/reset remount can purge a
  // graph mid-draw.
  useEffect(() => {
    const el = ref.current
    if (el) void Plotly.react(el, data, layout, config).then(() => { readyRef.current = true }).catch(() => {})
  }, [data, layout, config])

  // Bind events once and own all teardown in a single cleanup so order is deterministic: remove the
  // listeners first (guarded, since Plotly only adds the emitter once a plot exists), then purge, and
  // only purge after a draw has resolved so a remount cannot tear down a graph mid-draw. years is read
  // through a ref so the handlers never need rebinding.
  useEffect(() => {
    const el = ref.current as PlotlyHTMLElement | null
    if (!el) return
    const snapYear = (value: number) => yearsRef.current.reduce((nearest, year) => (Math.abs(year - value) < Math.abs(nearest - value) ? year : nearest), yearsRef.current[0])
    const keyOf = (event: PlotMouseEvent) => {
      const meta = (event.points[0]?.data as { meta?: unknown } | undefined)?.meta
      return typeof meta === 'string' ? meta : null
    }
    const onHover = (event: PlotMouseEvent) => {
      const point = event.points[0]
      if (point) setInspection((state) => ({ ...state, activeYear: snapYear(Number(point.x)), activeSeriesKey: keyOf(event) }))
    }
    const onUnhover = () => setInspection((state) => ({ ...state, activeSeriesKey: null }))
    const onClick = (event: PlotMouseEvent) => {
      const point = event.points[0]
      if (!point) return
      const year = snapYear(Number(point.x))
      setInspection((state) => ({ ...state, activeYear: year, pinnedYear: state.pinnedYear === year ? null : year }))
    }
    if (typeof el.on === 'function') {
      el.on('plotly_hover', onHover)
      el.on('plotly_unhover', onUnhover)
      el.on('plotly_click', onClick)
    }
    return () => {
      if (typeof el.removeAllListeners === 'function') {
        el.removeAllListeners('plotly_hover')
        el.removeAllListeners('plotly_unhover')
        el.removeAllListeners('plotly_click')
      }
      if (readyRef.current) {
        try { Plotly.purge(el) } catch { /* graph already torn down */ }
      }
    }
  }, [setInspection])

  return <div className="plotly-wrap" ref={ref} />
}
