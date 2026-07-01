import * as Plot from '@observablehq/plot'
import { useEffect, useMemo, useRef } from 'react'
import { counterfactualCells, counterfactualExtent, counterfactualLineData, lineExtent, netLineData, targetLineData } from '../chartDerivedData'
import { barXDomain, barXBands, visibleYearTicks } from '../chartScales'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { nearestYearFromX, seriesValueExtent, signedBands, stackBySign, stackCellAtPoint, stackExtent, yearsFromSpec } from '../stackUtils'
import type { RendererProps, StackCell } from '../types'

const factualHashPatternId = 'factual-fill-diagonal-hash'
const svgNamespace = 'http://www.w3.org/2000/svg'

function addFactualHashPattern(svg: SVGSVGElement) {
  const defs = document.createElementNS(svgNamespace, 'defs')
  const pattern = document.createElementNS(svgNamespace, 'pattern')
  pattern.setAttribute('id', factualHashPatternId)
  pattern.setAttribute('width', '8')
  pattern.setAttribute('height', '8')
  pattern.setAttribute('patternUnits', 'userSpaceOnUse')
  pattern.setAttribute('patternTransform', 'rotate(45)')

  const line = document.createElementNS(svgNamespace, 'line')
  line.setAttribute('x1', '0')
  line.setAttribute('y1', '0')
  line.setAttribute('x2', '0')
  line.setAttribute('y2', '8')
  line.setAttribute('stroke', '#475569')
  line.setAttribute('stroke-width', '1.4')
  line.setAttribute('opacity', '0.55')

  pattern.append(line)
  defs.append(pattern)
  svg.prepend(defs)
}

export function ObservablePlotStackChart({ spec, chartKind, chartType, viewMode, showNetLine, showTargets, width, height, inspection, setInspection }: RendererProps) {
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
  const lineDomain = lineExtent(spec.data, spec.series)
  const wedgeLines = useMemo(() => counterfactualLineData(spec.data, spec.series), [spec])
  const wedgeCells = useMemo(() => counterfactualCells(spec.data, spec.series), [spec])
  const wedgeDomain = counterfactualExtent(wedgeCells, wedgeLines)
  const barBands = useMemo(() => barXBands(years), [years])
  const barBandByYear = useMemo(() => new Map(barBands.map((band) => [band.year, band])), [barBands])
  const withBarBand = <T extends { year: number }>(item: T) => ({ ...item, ...barBandByYear.get(item.year) })

  useEffect(() => {
    if (chartKind === 'line') {
      const lineMarks = [
        Plot.gridY({ stroke: '#e7eaf0' }),
        Plot.ruleY([0], { stroke: '#697386' }),
        ...spec.series.map((series) => Plot.lineY(spec.data, {
          x: 'year',
          y: series.key,
          curve: spec.options.interpolation === 'step' ? 'step-after' : 'linear',
          stroke: colorForKey(spec, series.key),
          strokeWidth: inspection.activeSeriesKey === series.key ? 2.5 : 1.6,
          strokeOpacity: inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.2 : 1,
        })),
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
        y: { domain: [lineDomain[0] * 1.08, lineDomain[1] * 1.08], label: null, ticks: 4 },
        style: { fontSize: `${tokens.axisFontSize}px`, overflow: 'visible' },
        marks: lineMarks,
      })
      ref.current?.replaceChildren(plot)
      return () => plot.remove()
    }

    if (chartKind === 'counterfactual') {
      const xDomain = chartType === 'bar' ? barXDomain(years) : [Math.min(...years), Math.max(...years)]
      const plot = Plot.plot({
        width,
        height,
        marginTop: tokens.chartMargin.top,
        marginRight: tokens.chartMargin.right,
        marginBottom: tokens.chartMargin.bottom,
        marginLeft: tokens.chartMargin.left,
        x: { type: 'linear', domain: xDomain, ticks: xTicks, label: null },
        y: { domain: [wedgeDomain[0] * 1.08, wedgeDomain[1] * 1.08], label: null, ticks: 4 },
        style: { fontSize: `${tokens.axisFontSize}px`, overflow: 'visible' },
        marks: [
          Plot.gridY({ stroke: '#e7eaf0' }),
          Plot.ruleY([0], { stroke: '#697386' }),
          ...(chartType === 'area'
            ? [Plot.areaY(wedgeLines.filter((point) => point.factual != null), {
              x: 'year', y1: () => 0, y2: 'factual', fill: '#64748b', fillOpacity: 0.1,
            }), Plot.areaY(wedgeLines.filter((point) => point.factual != null), {
              x: 'year', y1: () => 0, y2: 'factual', fill: `url(#${factualHashPatternId})`, fillOpacity: 0.65,
            })]
            : [Plot.rectY(wedgeLines.filter((point) => point.factual != null).map(withBarBand), {
              x1: 'x0', x2: 'x1', y1: () => 0, y2: 'factual', fill: '#64748b', fillOpacity: 0.08, stroke: '#94a3b8', strokeOpacity: 0.18,
            }), Plot.rectY(wedgeLines.filter((point) => point.factual != null).map(withBarBand), {
              x1: 'x0', x2: 'x1', y1: () => 0, y2: 'factual', fill: `url(#${factualHashPatternId})`, fillOpacity: 0.65,
            })]),
          ...(chartType === 'area'
            ? spec.series.flatMap((series) => (['positive', 'negative'] as const).map((sign) => Plot.areaY(
              wedgeCells.filter((cell) => cell.key === series.key && !cell.isMissing && cell.sign === sign),
              {
                x: 'year',
                y1: 'y0',
                y2: 'y1',
                curve: spec.options.interpolation === 'step' ? 'step-after' : 'linear',
                fill: colorForKey(spec, series.key),
                fillOpacity: inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.76,
                stroke: inspection.activeSeriesKey === series.key ? '#111827' : undefined,
              },
            )))
            : [Plot.rectY(wedgeCells.filter((cell) => !cell.isMissing && cell.sign !== 'zero').map(withBarBand), {
              x1: 'x0', x2: 'x1', y1: 'y0', y2: 'y1', fill: (cell) => colorForKey(spec, cell.key), fillOpacity: (cell) => inspection.activeSeriesKey && inspection.activeSeriesKey !== cell.key ? 0.18 : 0.76,
            })]),
          Plot.lineY(wedgeLines, { x: 'year', y: 'counterfactual', stroke: '#0f172a', strokeWidth: 3, strokeDasharray: '6 4' }),
          Plot.lineY(wedgeLines, { x: 'year', y: 'factual', stroke: '#dc2626', strokeWidth: 3.2 }),
          ...(selectedYear == null ? [] : [Plot.ruleX([selectedYear], { stroke: '#111827', strokeDasharray: '3 3' })]),
        ],
      })
      if (plot instanceof SVGSVGElement) addFactualHashPattern(plot)
      ref.current?.replaceChildren(plot)
      return () => plot.remove()
    }

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
          : [Plot.rectY(cells.filter((cell) => !cell.isMissing && cell.sign !== 'zero').map(withBarBand), {
            x1: 'x0', x2: 'x1', y1: 'y0', y2: 'y1', fill: (cell: StackCell) => colorForKey(spec, cell.key), fillOpacity: (cell: StackCell) => inspection.activeSeriesKey && inspection.activeSeriesKey !== cell.key ? 0.18 : 0.76,
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
      x: { type: 'linear', domain: chartType === 'bar' ? barXDomain(years) : [Math.min(...years), Math.max(...years)], ticks: xTicks, label: null },
      y: { domain: [yMin * 1.05, yMax * 1.05], label: null, ticks: 4 },
      style: { fontSize: `${tokens.axisFontSize}px`, overflow: 'visible' },
      marks,
    })
    ref.current?.replaceChildren(plot)
    return () => plot.remove()
  }, [cells, chartKind, chartType, height, inspection.activeSeriesKey, lineDomain, net, selectedYear, showNetLine, showTargets, spec, targets, tokens, wedgeCells, wedgeDomain, wedgeLines, width, xTicks, yMax, yMin, years])

  function inspect(clientX: number, clientY: number, rect: DOMRect) {
    const innerLeft = tokens.chartMargin.left
    const innerRight = width - tokens.chartMargin.right
    const innerTop = tokens.chartMargin.top
    const innerBottom = height - tokens.chartMargin.bottom
    const [domainMin, domainMax] = chartType === 'bar' ? barXDomain(years) : [Math.min(...years), Math.max(...years)]
    const xScale = (year: number) => innerLeft + ((year - domainMin) / (domainMax - domainMin)) * (innerRight - innerLeft)
    const paddedMin = yMin * 1.05
    const paddedMax = yMax * 1.05
    const yScale = (value: number) => innerBottom - ((value - paddedMin) / (paddedMax - paddedMin)) * (innerBottom - innerTop)
    const year = nearestYearFromX(clientX - rect.left, years, xScale)
    const cell = stackCellAtPoint(cells, year, clientY - rect.top, yScale)
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
  }

  function inspectLine(clientX: number, clientY: number, rect: DOMRect) {
    const innerLeft = tokens.chartMargin.left
    const innerRight = width - tokens.chartMargin.right
    const innerTop = tokens.chartMargin.top
    const innerBottom = height - tokens.chartMargin.bottom
    const [xDomainMin, xDomainMax] = [Math.min(...years), Math.max(...years)]
    const xScale = (year: number) => innerLeft + ((year - xDomainMin) / (xDomainMax - xDomainMin)) * (innerRight - innerLeft)
    const yScale = (value: number) => innerBottom - ((value - lineDomain[0] * 1.08) / (lineDomain[1] * 1.08 - lineDomain[0] * 1.08)) * (innerBottom - innerTop)
    const year = nearestYearFromX(clientX - rect.left, years, xScale)
    const row = spec.data.find((point) => point.year === year)
    const active = row == null ? null : spec.series.reduce<string | null>((nearest, series) => {
      const value = row[series.key]
      if (value == null) return nearest
      if (nearest == null) return series.key
      return Math.abs(yScale(value) - (clientY - rect.top)) < Math.abs(yScale(row[nearest] ?? 0) - (clientY - rect.top)) ? series.key : nearest
    }, null)
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: active }))
  }

  function inspectWedge(clientX: number, clientY: number, rect: DOMRect) {
    const innerLeft = tokens.chartMargin.left
    const innerRight = width - tokens.chartMargin.right
    const innerTop = tokens.chartMargin.top
    const innerBottom = height - tokens.chartMargin.bottom
    const domainMin = wedgeDomain[0] * 1.08
    const domainMax = wedgeDomain[1] * 1.08
    const [xDomainMin, xDomainMax] = chartType === 'bar' ? barXDomain(years) : [Math.min(...years), Math.max(...years)]
    const xScale = (year: number) => innerLeft + ((year - xDomainMin) / (xDomainMax - xDomainMin)) * (innerRight - innerLeft)
    const yScale = (value: number) => innerBottom - ((value - domainMin) / (domainMax - domainMin)) * (innerBottom - innerTop)
    const year = nearestYearFromX(clientX - rect.left, years, xScale)
    const y = clientY - rect.top
    const cell = wedgeCells.find((item) => item.year === year && !item.isMissing && item.sign !== 'zero' && y >= Math.min(yScale(item.y0), yScale(item.y1)) && y <= Math.max(yScale(item.y0), yScale(item.y1)))
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
  }

  const inspectForKind = chartKind === 'line' ? inspectLine : chartKind === 'counterfactual' ? inspectWedge : inspect

  return <div className="observable-wrap" ref={ref} onPointerMove={(event) => inspectForKind(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())} onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))} onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))} />
}
