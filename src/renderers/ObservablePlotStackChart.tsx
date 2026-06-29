import * as Plot from '@observablehq/plot'
import { useEffect, useMemo, useRef } from 'react'
import { netLineData, targetLineData } from '../chartDerivedData'
import { visibleYearTicks } from '../chartScales'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { nearestYearFromX, seriesValueExtent, signedBands, stackBySign, stackCellAtPoint, stackExtent, yearsFromSpec } from '../stackUtils'
import type { RendererProps, StackCell } from '../types'

export function ObservablePlotStackChart({ spec, chartType, viewMode, showNetLine, showTargets, width, height, inspection, setInspection }: RendererProps) {
  const ref = useRef<HTMLDivElement | null>(null)
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
  const selectedYear = inspection.pinnedYear ?? inspection.activeYear

  useEffect(() => {
    const marks = [
      Plot.gridY({ stroke: '#e7eaf0' }),
      Plot.ruleY([0], { stroke: '#697386' }),
      ...(chartType === 'area'
        ? signedBands(spec.data, spec.series).map((band) => Plot.areaY(band.points, {
          x: 'year',
          y1: 'y0',
          y2: 'y1',
          curve: spec.options.interpolation === 'step' ? 'step-after' : 'linear',
          fill: colorForKey(spec, band.key),
          fillOpacity: inspection.activeSeriesKey && inspection.activeSeriesKey !== band.key ? 0.18 : 0.76,
          stroke: inspection.activeSeriesKey === band.key ? '#111827' : undefined,
        }))
        : chartType === 'line'
          ? spec.series.map((series) => Plot.lineY(spec.data, {
            x: 'year',
            y: series.key,
            curve: spec.options.interpolation === 'step' ? 'step-after' : 'linear',
            stroke: colorForKey(spec, series.key),
            strokeWidth: 1.5,
            strokeOpacity: inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.85,
          }))
          : [Plot.rectY(cells.filter((cell) => !cell.isMissing && cell.sign !== 'zero'), {
            x: 'year', y1: 'y0', y2: 'y1', interval: 1, fill: (cell: StackCell) => colorForKey(spec, cell.key), fillOpacity: (cell: StackCell) => inspection.activeSeriesKey && inspection.activeSeriesKey !== cell.key ? 0.18 : 0.76,
          })]),
      ...(showTargets ? [Plot.lineY(targets, { x: 'year', y: 'target', stroke: '#7c3aed', strokeWidth: 1.4, strokeDasharray: '5 4' })] : []),
      ...(showNetLine ? [Plot.lineY(net, { x: 'year', y: 'net', stroke: '#111827', strokeWidth: 1.5 })] : []),
      ...(selectedYear == null ? [] : [Plot.ruleX([selectedYear], { stroke: '#111827', strokeDasharray: '3 3' })]),
    ]

    const plot = Plot.plot({
      width,
      height,
      marginTop: tokens.chartMargin.top,
      marginRight: tokens.chartMargin.right,
      marginBottom: tokens.chartMargin.bottom,
      marginLeft: tokens.chartMargin.left,
      x: { type: 'linear', domain: [Math.min(...years), Math.max(...years)], ticks: xTicks, label: null },
      y: { domain: [yMin * 1.05, yMax * 1.05], label: null, ticks: 4 },
      style: { fontSize: `${tokens.axisFontSize}px`, overflow: 'visible' },
      marks,
    })
    ref.current?.replaceChildren(plot)
    return () => plot.remove()
  }, [cells, chartType, height, inspection.activeSeriesKey, net, selectedYear, showNetLine, showTargets, spec, targets, tokens, width, xTicks, yMax, yMin, years])

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

  return <div className="observable-wrap" ref={ref} onPointerMove={(event) => inspect(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())} onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))} onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))} />
}
