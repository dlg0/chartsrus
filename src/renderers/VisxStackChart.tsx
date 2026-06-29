import { curveLinear, curveStepAfter } from '@visx/curve'
import { GridRows } from '@visx/grid'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'
import { AreaClosed, Bar, LinePath } from '@visx/shape'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { useMemo } from 'react'
import { netLineData, targetLineData } from '../chartDerivedData'
import { visibleYearTicks } from '../chartScales'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { nearestYearFromX, seriesValueExtent, signedBands, stackBySign, stackCellAtPoint, stackExtent, yearsFromSpec } from '../stackUtils'
import type { BandPoint } from '../stackUtils'
import type { RendererProps, StackDatum } from '../types'

export function VisxStackChart({ spec, chartType, viewMode, showNetLine, showTargets, width, height, inspection, setInspection }: RendererProps) {
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
  const xScale = scaleLinear({ domain: [Math.min(...years), Math.max(...years)], range: [0, innerWidth] })
  const yScale = scaleLinear({ domain: [yMin * 1.05, yMax * 1.05], range: [innerHeight, 0], nice: true })
  const selectedYear = inspection.pinnedYear ?? inspection.activeYear

  function setFocusFromPointer(clientX: number, clientY: number, rect: DOMRect) {
    const x = clientX - rect.left - margin.left
    const y = clientY - rect.top - margin.top
    const year = nearestYearFromX(x, years, xScale)
    const cell = stackCellAtPoint(cells, year, y, yScale)
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
  }

  const barWidth = Math.max(2, innerWidth / years.length / 2)

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
        {chartType === 'bar' && cells.filter((cell) => !cell.isMissing && cell.sign !== 'zero').map((cell) => (
          <rect
            key={`${cell.key}-${cell.year}`}
            x={xScale(cell.year) - barWidth / 2}
            y={Math.min(yScale(cell.y0), yScale(cell.y1))}
            width={barWidth}
            height={Math.abs(yScale(cell.y0) - yScale(cell.y1))}
            fill={colorForKey(spec, cell.key)}
            opacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== cell.key ? 0.18 : 0.82}
          />
        ))}
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
