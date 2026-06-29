import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { netLineData, targetLineData } from '../chartDerivedData'
import { readableYTicks, visibleYearTicks } from '../chartScales'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { getSignChangingSeriesKeys, nearestYearFromX, seriesValueExtent, stackBySign, stackCellAtPoint, stackExtent, yearsFromSpec } from '../stackUtils'
import type { RendererProps } from '../types'

export function RechartsStackChart({ spec, chartType, viewMode, showNetLine, showTargets, width, inspection, setInspection }: RendererProps) {
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
  const yDomain: [number, number] = [Math.floor(yMin * 1.1), Math.ceil(yMax * 1.1)]
  const yTicks = useMemo(() => readableYTicks(yDomain[0], yDomain[1]), [yDomain])
  const selectedYear = inspection.pinnedYear ?? inspection.activeYear
  const Component = chartType === 'area' ? AreaChart : chartType === 'line' ? LineChart : BarChart
  const signChangingKeys = useMemo(() => getSignChangingSeriesKeys(spec.data, spec.series), [spec])
  const stackOrder = useMemo(() => [
    ...spec.series.filter((series) => signChangingKeys.has(series.key)),
    ...spec.series.filter((series) => !signChangingKeys.has(series.key)),
  ], [signChangingKeys, spec.series])
  const chartData = useMemo(() => spec.data.map((row) => {
    const next: Record<string, number | null> = { year: row.year }
    const netPoint = net.find((point) => point.year === row.year)
    const targetPoint = targets.find((point) => point.year === row.year)
    next.net = netPoint?.net ?? null
    next.target = targetPoint?.target ?? null
    for (const series of spec.series) {
      const value = row[series.key]
      next[series.key] = value // raw value, for line mode
      // Off-sign contributions are 0 (a continuous zero-thickness taper), not null, so the sign-split
      // areas never break and meet cleanly at the baseline. Only genuinely missing values stay null.
      next[`${series.key}__pos`] = value == null ? null : Math.max(0, value)
      next[`${series.key}__neg`] = value == null ? null : Math.min(0, value)
    }
    return next
  }), [net, spec, targets])

  function inspect(clientX: number, clientY: number, rect: DOMRect) {
    const innerLeft = tokens.chartMargin.left
    const innerRight = width - tokens.chartMargin.right
    const innerTop = tokens.chartMargin.top
    const innerBottom = rect.height - tokens.chartMargin.bottom
    const domainMin = Math.min(...years)
    const domainMax = Math.max(...years)
    const xScale = (year: number) => innerLeft + ((year - domainMin) / (domainMax - domainMin)) * (innerRight - innerLeft)
    const yScale = (value: number) => innerBottom - ((value - yDomain[0]) / (yDomain[1] - yDomain[0])) * (innerBottom - innerTop)
    const year = nearestYearFromX(clientX - rect.left, years, xScale)
    const cell = stackCellAtPoint(cells, year, clientY - rect.top, yScale)
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
  }

  return (
    <div className="recharts-wrap" onPointerMove={(event) => inspect(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())} onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))} onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))}>
      <ResponsiveContainer width="100%" height="100%">
        <Component data={chartData} margin={tokens.chartMargin} stackOffset="sign">
          <CartesianGrid stroke="#e7eaf0" vertical={false} />
          <XAxis dataKey="year" type="number" domain={[Math.min(...years), Math.max(...years)]} ticks={xTicks} tick={{ fontSize: tokens.axisFontSize }} interval={0} />
          <YAxis domain={yDomain} ticks={yTicks} tick={{ fontSize: tokens.axisFontSize }} width={tokens.chartMargin.left - 2} />
          <Tooltip content={() => null} cursor={false} />
          <ReferenceLine y={0} stroke="#697386" />
          {selectedYear != null && <ReferenceLine x={selectedYear} stroke="#111827" strokeDasharray="3 3" />}
          {chartType === 'line'
            ? spec.series.map((series) => (
              <Line key={series.key} type={spec.options.interpolation === 'step' ? 'stepAfter' : 'linear'} dataKey={series.key} stroke={colorForKey(spec, series.key)} strokeWidth={1.5} strokeOpacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.9} dot={false} isAnimationActive={false} connectNulls={false} />
            ))
            : stackOrder.flatMap((series) => (['__pos', '__neg'] as const).map((suffix) => chartType === 'area' ? (
              <Area key={`${series.key}${suffix}`} dataKey={`${series.key}${suffix}`} stackId="stack" type={spec.options.interpolation === 'step' ? 'stepAfter' : 'linear'} fill={colorForKey(spec, series.key)} stroke={inspection.activeSeriesKey === series.key ? '#111827' : 'none'} fillOpacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.72} isAnimationActive={false} connectNulls={false} />
            ) : (
              <Bar key={`${series.key}${suffix}`} dataKey={`${series.key}${suffix}`} stackId="stack" fill={colorForKey(spec, series.key)} fillOpacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.78} isAnimationActive={false} />
            )))}
          {showTargets && <Line type="linear" dataKey="target" dot={false} stroke="#7c3aed" strokeDasharray="5 4" strokeWidth={1.4} isAnimationActive={false} />}
          {showNetLine && <Line type="linear" dataKey="net" dot={false} stroke="#111827" strokeWidth={1.5} isAnimationActive={false} />}
        </Component>
      </ResponsiveContainer>
    </div>
  )
}
