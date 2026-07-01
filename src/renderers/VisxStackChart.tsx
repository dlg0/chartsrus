import { curveLinear, curveStepAfter } from '@visx/curve'
import { GridRows } from '@visx/grid'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'
import { AreaClosed, Bar, LinePath } from '@visx/shape'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { useMemo } from 'react'
import { counterfactualCells, counterfactualExtent, counterfactualLineData, lineExtent, netLineData, targetLineData } from '../chartDerivedData'
import { barXDomain, barXBands, visibleYearTicks } from '../chartScales'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { nearestYearFromX, seriesValueExtent, signedBands, stackBySign, stackCellAtPoint, stackExtent, yearsFromSpec } from '../stackUtils'
import type { BandPoint } from '../stackUtils'
import type { RendererProps, StackDatum } from '../types'

const factualHashPatternId = 'factual-fill-diagonal-hash'

export function VisxStackChart({ spec, chartKind, chartType, viewMode, showNetLine, showTargets, width, height, inspection, setInspection }: RendererProps) {
  const tokens = densityTokens[spec.options.density]
  const margin = tokens.chartMargin
  const innerWidth = Math.max(1, width - margin.left - margin.right)
  const innerHeight = Math.max(1, height - margin.top - margin.bottom)
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
  const xDomain = chartType === 'bar' && chartKind !== 'line' ? barXDomain(years) : [Math.min(...years), Math.max(...years)] as [number, number]
  const xScale = scaleLinear({ domain: xDomain, range: [0, innerWidth] })
  const barBands = useMemo(() => barXBands(years), [years])
  const barBandByYear = useMemo(() => new Map(barBands.map((band) => [band.year, band])), [barBands])
  const yScale = scaleLinear({ domain: [yMin * 1.05, yMax * 1.05], range: [innerHeight, 0], nice: true })
  const lineDomain = lineExtent(spec.data, spec.series)
  const lineScale = scaleLinear({ domain: [lineDomain[0] * 1.08, lineDomain[1] * 1.08], range: [innerHeight, 0], nice: true })
  const wedgeLines = useMemo(() => counterfactualLineData(spec.data, spec.series), [spec])
  const wedgeCells = useMemo(() => counterfactualCells(spec.data, spec.series), [spec])
  const wedgeDomain = counterfactualExtent(wedgeCells, wedgeLines)
  const wedgeScale = scaleLinear({ domain: [wedgeDomain[0] * 1.08, wedgeDomain[1] * 1.08], range: [innerHeight, 0], nice: true })
  const selectedYear = inspection.pinnedYear ?? inspection.activeYear

  function setFocusFromPointer(clientX: number, clientY: number, rect: DOMRect) {
    const x = clientX - rect.left - margin.left
    const y = clientY - rect.top - margin.top
    const year = nearestYearFromX(x, years, xScale)
    const cell = stackCellAtPoint(cells, year, y, yScale)
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
  }

  function setLineFocus(clientX: number, clientY: number, rect: DOMRect) {
    const x = clientX - rect.left - margin.left
    const y = clientY - rect.top - margin.top
    const year = nearestYearFromX(x, years, xScale)
    const row = spec.data.find((point) => point.year === year)
    const active = row == null ? null : spec.series.reduce<string | null>((nearest, series) => {
      const value = row[series.key]
      if (value == null) return nearest
      if (nearest == null) return series.key
      return Math.abs(lineScale(value) - y) < Math.abs(lineScale(row[nearest] ?? 0) - y) ? series.key : nearest
    }, null)
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: active }))
  }

  function setWedgeFocus(clientX: number, clientY: number, rect: DOMRect) {
    const x = clientX - rect.left - margin.left
    const y = clientY - rect.top - margin.top
    const year = nearestYearFromX(x, years, xScale)
    const cell = wedgeCells.find((item) => item.year === year && !item.isMissing && item.sign !== 'zero' && y >= Math.min(wedgeScale(item.y0), wedgeScale(item.y1)) && y <= Math.max(wedgeScale(item.y0), wedgeScale(item.y1)))
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
  }

  if (chartKind === 'line') {
    return (
      <svg width={width} height={height} className="chart-svg">
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={lineScale} width={innerWidth} stroke="#e7eaf0" numTicks={4} />
          <line x1={0} x2={innerWidth} y1={lineScale(0)} y2={lineScale(0)} stroke="#697386" strokeWidth={1} />
          {spec.series.map((series) => {
            const points = spec.data.map((row) => row[series.key] == null ? null : `${xScale(row.year)},${lineScale(row[series.key] ?? 0)}`).filter(Boolean).join(' ')
            return <polyline key={series.key} points={points} fill="none" stroke={colorForKey(spec, series.key)} strokeWidth={inspection.activeSeriesKey === series.key ? 2.5 : 1.6} opacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.2 : 1} pointerEvents="none" />
          })}
          {selectedYear != null && <line className="cursor-line" x1={xScale(selectedYear)} x2={xScale(selectedYear)} y1={0} y2={innerHeight} />}
          <AxisLeft scale={lineScale} tickLabelProps={{ fontSize: tokens.axisFontSize, fill: '#52606d', dx: -3, dy: 3, textAnchor: 'end' }} stroke="#c6ccd6" tickStroke="#c6ccd6" numTicks={4} />
          <AxisBottom top={innerHeight} scale={xScale} tickValues={xTicks} tickLabelProps={{ fontSize: tokens.axisFontSize, fill: '#52606d', dy: 2, textAnchor: 'middle' }} stroke="#c6ccd6" tickStroke="#c6ccd6" />
          <Bar x={0} y={0} width={innerWidth} height={innerHeight} fill="transparent" onPointerMove={(event) => setLineFocus(event.clientX, event.clientY, event.currentTarget.ownerSVGElement!.getBoundingClientRect())} onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))} onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))} />
        </Group>
      </svg>
    )
  }

  if (chartKind === 'counterfactual') {
    return (
      <svg width={width} height={height} className="chart-svg">
        <defs>
          <pattern id={factualHashPatternId} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={8} stroke="#475569" strokeWidth={1.4} opacity={0.55} />
          </pattern>
        </defs>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={wedgeScale} width={innerWidth} stroke="#e7eaf0" numTicks={4} />
          <line x1={0} x2={innerWidth} y1={wedgeScale(0)} y2={wedgeScale(0)} stroke="#697386" strokeWidth={1} />
          {chartType === 'area' ? (
            (() => {
              const factualFillPoints = [
                ...wedgeLines.filter((point) => point.factual != null).map((point) => `${xScale(point.year)},${wedgeScale(point.factual ?? 0)}`),
                ...wedgeLines.filter((point) => point.factual != null).reverse().map((point) => `${xScale(point.year)},${wedgeScale(0)}`),
              ].join(' ')
              return (
                <>
                  <polygon points={factualFillPoints} fill="#64748b" opacity={0.1} pointerEvents="none" />
                  <polygon points={factualFillPoints} fill={`url(#${factualHashPatternId})`} opacity={0.65} pointerEvents="none" />
                </>
              )
            })()
          ) : wedgeLines.filter((point) => point.factual != null).map((point) => {
            const band = barBandByYear.get(point.year)
            if (band == null) return null
            const x0 = xScale(band.x0)
            const width = xScale(band.x1) - x0
            return (
              <g key={`factual-bg-${point.year}`}>
                <rect x={x0} y={Math.min(wedgeScale(0), wedgeScale(point.factual ?? 0))} width={width} height={Math.abs(wedgeScale(0) - wedgeScale(point.factual ?? 0))} fill="#64748b" opacity={0.08} stroke="#94a3b8" strokeOpacity={0.18} />
                <rect x={x0} y={Math.min(wedgeScale(0), wedgeScale(point.factual ?? 0))} width={width} height={Math.abs(wedgeScale(0) - wedgeScale(point.factual ?? 0))} fill={`url(#${factualHashPatternId})`} opacity={0.65} />
              </g>
            )
          })}
          {chartType === 'area'
            ? spec.series.flatMap((series) => (['positive', 'negative'] as const).map((sign) => {
              const segment = wedgeCells.filter((cell) => cell.key === series.key && !cell.isMissing && cell.sign === sign)
              return segment.length === 0 ? null : (
                <AreaClosed
                  key={`${series.key}-${sign}`}
                  data={segment}
                  yScale={wedgeScale}
                  x={(cell) => xScale(cell.year)}
                  y0={(cell) => wedgeScale(cell.y0)}
                  y1={(cell) => wedgeScale(cell.y1)}
                  curve={spec.options.interpolation === 'step' ? curveStepAfter : curveLinear}
                  fill={colorForKey(spec, series.key)}
                  opacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.82}
                  stroke={inspection.activeSeriesKey === series.key ? '#111827' : 'none'}
                />
              )
            }))
            : wedgeCells.filter((cell) => !cell.isMissing && cell.sign !== 'zero').map((cell) => {
              const band = barBandByYear.get(cell.year)
              if (band == null) return null
              const x0 = xScale(band.x0)
              return <rect key={`${cell.key}-${cell.year}`} x={x0} y={Math.min(wedgeScale(cell.y0), wedgeScale(cell.y1))} width={xScale(band.x1) - x0} height={Math.abs(wedgeScale(cell.y0) - wedgeScale(cell.y1))} fill={colorForKey(spec, cell.key)} opacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== cell.key ? 0.18 : 0.82} />
            })}
          <polyline points={wedgeLines.filter((point) => point.counterfactual != null).map((point) => `${xScale(point.year)},${wedgeScale(point.counterfactual ?? 0)}`).join(' ')} fill="none" stroke="#0f172a" strokeWidth={3} strokeDasharray="6 4" pointerEvents="none" />
          <polyline points={wedgeLines.filter((point) => point.factual != null).map((point) => `${xScale(point.year)},${wedgeScale(point.factual ?? 0)}`).join(' ')} fill="none" stroke="#dc2626" strokeWidth={3.2} pointerEvents="none" />
          {selectedYear != null && <line className="cursor-line" x1={xScale(selectedYear)} x2={xScale(selectedYear)} y1={0} y2={innerHeight} />}
          <AxisLeft scale={wedgeScale} tickLabelProps={{ fontSize: tokens.axisFontSize, fill: '#52606d', dx: -3, dy: 3, textAnchor: 'end' }} stroke="#c6ccd6" tickStroke="#c6ccd6" numTicks={4} />
          <AxisBottom top={innerHeight} scale={xScale} tickValues={xTicks} tickLabelProps={{ fontSize: tokens.axisFontSize, fill: '#52606d', dy: 2, textAnchor: 'middle' }} stroke="#c6ccd6" tickStroke="#c6ccd6" />
          <Bar x={0} y={0} width={innerWidth} height={innerHeight} fill="transparent" onPointerMove={(event) => setWedgeFocus(event.clientX, event.clientY, event.currentTarget.ownerSVGElement!.getBoundingClientRect())} onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))} onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))} />
        </Group>
      </svg>
    )
  }

  return (
    <svg width={width} height={height} className="chart-svg">
      <Group left={margin.left} top={margin.top}>
        <GridRows scale={yScale} width={innerWidth} stroke="#e7eaf0" numTicks={4} />
        <line x1={0} x2={innerWidth} y1={yScale(0)} y2={yScale(0)} stroke="#697386" strokeWidth={1} />
        {chartType === 'area' && signedBands(spec.data, spec.series).map((band, index) => (
          <AreaClosed<BandPoint>
            key={`${band.key}-${band.sign}-${index}`}
            data={band.points}
            yScale={yScale}
            x={(point) => xScale(point.year)}
            y0={(point) => yScale(point.y0)}
            y1={(point) => yScale(point.y1)}
            curve={spec.options.interpolation === 'step' ? curveStepAfter : curveLinear}
            fill={colorForKey(spec, band.key)}
            fillOpacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== band.key ? 0.18 : 0.82}
            stroke={inspection.activeSeriesKey === band.key ? '#111827' : 'none'}
            strokeWidth={inspection.activeSeriesKey === band.key ? 1 : 0}
          />
        ))}
        {chartType === 'bar' && cells.filter((cell) => !cell.isMissing && cell.sign !== 'zero').map((cell) => {
          const band = barBandByYear.get(cell.year)
          if (band == null) return null
          const x0 = xScale(band.x0)
          return (
            <rect
              key={`${cell.key}-${cell.year}`}
              x={x0}
              y={Math.min(yScale(cell.y0), yScale(cell.y1))}
              width={xScale(band.x1) - x0}
              height={Math.abs(yScale(cell.y0) - yScale(cell.y1))}
              fill={colorForKey(spec, cell.key)}
              opacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== cell.key ? 0.18 : 0.82}
            />
          )
        })}
        {chartType === 'line' && spec.series.map((series) => (
          <LinePath<StackDatum>
            key={series.key}
            data={spec.data}
            x={(datum) => xScale(datum.year)}
            y={(datum) => yScale(datum[series.key] ?? 0)}
            defined={(datum) => datum[series.key] != null}
            curve={spec.options.interpolation === 'step' ? curveStepAfter : curveLinear}
            stroke={colorForKey(spec, series.key)}
            strokeWidth={1.5}
            strokeOpacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.85}
          />
        ))}
        {selectedYear != null && <line className="cursor-line" x1={xScale(selectedYear)} x2={xScale(selectedYear)} y1={0} y2={innerHeight} />}
        {showTargets && <polyline points={targets.map((point) => `${xScale(point.year)},${yScale(point.target)}`).join(' ')} fill="none" stroke="#7c3aed" strokeWidth={1.4} strokeDasharray="5 4" pointerEvents="none" />}
        {showNetLine && <polyline points={net.map((point) => `${xScale(point.year)},${yScale(point.net)}`).join(' ')} fill="none" stroke="#111827" strokeWidth={1.5} pointerEvents="none" />}
        <AxisLeft scale={yScale} tickLabelProps={{ fontSize: tokens.axisFontSize, fill: '#52606d', dx: -3, dy: 3, textAnchor: 'end' }} stroke="#c6ccd6" tickStroke="#c6ccd6" numTicks={4} />
        <AxisBottom top={innerHeight} scale={xScale} tickValues={xTicks} tickLabelProps={{ fontSize: tokens.axisFontSize, fill: '#52606d', dy: 2, textAnchor: 'middle' }} stroke="#c6ccd6" tickStroke="#c6ccd6" />
        <Bar
          x={0}
          y={0}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          onPointerMove={(event) => setFocusFromPointer(event.clientX, event.clientY, event.currentTarget.ownerSVGElement!.getBoundingClientRect())}
          onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))}
          onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))}
        />
      </Group>
    </svg>
  )
}
