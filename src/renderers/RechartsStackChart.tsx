import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { counterfactualCells, counterfactualExtent, counterfactualLineData, lineExtent, netLineData, targetLineData } from '../chartDerivedData'
import { barXDomain, barXBands, readableYTicks, visibleYearTicks } from '../chartScales'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { getSignChangingSeriesKeys, nearestYearFromX, seriesValueExtent, stackBySign, stackCellAtPoint, stackExtent, yearsFromSpec } from '../stackUtils'
import type { RendererProps } from '../types'

const factualHashPatternId = 'factual-fill-diagonal-hash'

type BarShapeProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  fillOpacity?: string | number
  stroke?: string
  strokeOpacity?: string | number
  payload?: { year?: number }
}

export function RechartsStackChart({ spec, chartKind, chartType, viewMode, showNetLine, showTargets, width, height, inspection, setInspection }: RendererProps) {
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
  const lineDomainBase = lineExtent(spec.data, spec.series)
  const lineDomain: [number, number] = [Math.floor(lineDomainBase[0] * 1.08), Math.ceil(lineDomainBase[1] * 1.08)]
  const wedgeLines = useMemo(() => counterfactualLineData(spec.data, spec.series), [spec])
  const wedgeCells = useMemo(() => counterfactualCells(spec.data, spec.series), [spec])
  const wedgeDomainBase = counterfactualExtent(wedgeCells, wedgeLines)
  const wedgeDomain: [number, number] = [Math.floor(wedgeDomainBase[0] * 1.08), Math.ceil(wedgeDomainBase[1] * 1.08)]
  const yTicks = useMemo(() => readableYTicks(yDomain[0], yDomain[1]), [yDomain])
  const lineTicks = useMemo(() => readableYTicks(lineDomain[0], lineDomain[1]), [lineDomain])
  const wedgeTicks = useMemo(() => readableYTicks(wedgeDomain[0], wedgeDomain[1]), [wedgeDomain])
  const barDomain = useMemo(() => barXDomain(years), [years])
  const barBands = useMemo(() => barXBands(years), [years])
  const barBandByYear = useMemo(() => new Map(barBands.map((band) => [band.year, band])), [barBands])
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
  const lineData = useMemo(() => spec.data.map((row) => ({ ...row })), [spec.data])
  const wedgeData = useMemo(() => spec.data.map((row) => {
    const next: Record<string, number | [number, number] | null> = { year: row.year }
    const line = wedgeLines.find((point) => point.year === row.year)
    next.counterfactual = line?.counterfactual ?? null
    next.factual = line?.factual ?? null
    next.factualBackground = line?.factual == null ? null : [Math.min(0, line.factual), Math.max(0, line.factual)]
    for (const series of spec.series) {
      const cell = wedgeCells.find((item) => item.year === row.year && item.key === series.key)
      next[series.key] = cell != null && !cell.isMissing && cell.sign !== 'zero' ? [Math.min(cell.y0, cell.y1), Math.max(cell.y0, cell.y1)] : null
    }
    return next
  }), [spec.series, spec.data, wedgeCells, wedgeLines])

  function renderVariableWidthBar(props: BarShapeProps) {
    const year = props.payload?.year
    const band = year == null ? null : barBandByYear.get(year)
    const chartInnerWidth = Math.max(1, width - tokens.chartMargin.left - tokens.chartMargin.right)
    const scaleX = (value: number) => tokens.chartMargin.left + ((value - barDomain[0]) / (barDomain[1] - barDomain[0])) * chartInnerWidth
    const x = band == null ? props.x ?? 0 : scaleX(band.x0)
    const rectWidth = band == null ? props.width ?? 0 : scaleX(band.x1) - x
    return <rect x={x} y={props.y ?? 0} width={rectWidth} height={props.height ?? 0} fill={props.fill} fillOpacity={props.fillOpacity} stroke={props.stroke} strokeOpacity={props.strokeOpacity} />
  }

  function inspect(clientX: number, clientY: number, rect: DOMRect) {
    const innerLeft = tokens.chartMargin.left
    const innerRight = width - tokens.chartMargin.right
    const innerTop = tokens.chartMargin.top
    const innerBottom = rect.height - tokens.chartMargin.bottom
    const [domainMin, domainMax] = chartType === 'bar' ? barDomain : [Math.min(...years), Math.max(...years)]
    const xScale = (year: number) => innerLeft + ((year - domainMin) / (domainMax - domainMin)) * (innerRight - innerLeft)
    const yScale = (value: number) => innerBottom - ((value - yDomain[0]) / (yDomain[1] - yDomain[0])) * (innerBottom - innerTop)
    const year = nearestYearFromX(clientX - rect.left, years, xScale)
    const cell = stackCellAtPoint(cells, year, clientY - rect.top, yScale)
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
  }

  function inspectLine(clientX: number, clientY: number, rect: DOMRect) {
    const innerLeft = tokens.chartMargin.left
    const innerRight = width - tokens.chartMargin.right
    const innerTop = tokens.chartMargin.top
    const innerBottom = rect.height - tokens.chartMargin.bottom
    const [domainMin, domainMax] = [Math.min(...years), Math.max(...years)]
    const xScale = (year: number) => innerLeft + ((year - domainMin) / (domainMax - domainMin)) * (innerRight - innerLeft)
    const yScale = (value: number) => innerBottom - ((value - lineDomain[0]) / (lineDomain[1] - lineDomain[0])) * (innerBottom - innerTop)
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
    const innerBottom = rect.height - tokens.chartMargin.bottom
    const [domainMin, domainMax] = chartType === 'bar' ? barDomain : [Math.min(...years), Math.max(...years)]
    const xScale = (year: number) => innerLeft + ((year - domainMin) / (domainMax - domainMin)) * (innerRight - innerLeft)
    const yScale = (value: number) => innerBottom - ((value - wedgeDomain[0]) / (wedgeDomain[1] - wedgeDomain[0])) * (innerBottom - innerTop)
    const year = nearestYearFromX(clientX - rect.left, years, xScale)
    const y = clientY - rect.top
    const cell = wedgeCells.find((item) => item.year === year && !item.isMissing && item.sign !== 'zero' && y >= Math.min(yScale(item.y0), yScale(item.y1)) && y <= Math.max(yScale(item.y0), yScale(item.y1)))
    setInspection((state) => ({ ...state, activeYear: year, activeSeriesKey: cell?.key ?? null }))
  }

  if (chartKind === 'line') {
    return (
      <div className="recharts-wrap" onPointerMove={(event) => inspectLine(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())} onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))} onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={lineData} margin={tokens.chartMargin}>
            <CartesianGrid stroke="#e7eaf0" vertical={false} />
            <XAxis dataKey="year" type="number" domain={[Math.min(...years), Math.max(...years)]} ticks={xTicks} tick={{ fontSize: tokens.axisFontSize }} interval={0} />
            <YAxis domain={lineDomain} ticks={lineTicks} tick={{ fontSize: tokens.axisFontSize }} width={tokens.chartMargin.left - 2} />
            <Tooltip content={() => null} cursor={false} />
            <ReferenceLine y={0} stroke="#697386" />
            {selectedYear != null && <ReferenceLine x={selectedYear} stroke="#111827" strokeDasharray="3 3" />}
            {spec.series.map((series) => <Line key={series.key} type={spec.options.interpolation === 'step' ? 'stepAfter' : 'linear'} dataKey={series.key} dot={false} stroke={colorForKey(spec, series.key)} strokeWidth={inspection.activeSeriesKey === series.key ? 2.5 : 1.6} strokeOpacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.2 : 1} isAnimationActive={false} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartKind === 'counterfactual') {
    if (chartType === 'area') {
      const margin = tokens.chartMargin
      const innerWidth = Math.max(1, width - margin.left - margin.right)
      const innerHeight = Math.max(1, height - margin.top - margin.bottom)
      const xScale = (year: number) => ((year - Math.min(...years)) / (Math.max(...years) - Math.min(...years))) * innerWidth
      const yScale = (value: number) => innerHeight - ((value - wedgeDomain[0]) / (wedgeDomain[1] - wedgeDomain[0])) * innerHeight
      return (
        <svg width={width} height={height} className="chart-svg" onPointerMove={(event) => inspectWedge(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())} onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))} onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))}>
          <defs>
            <pattern id={factualHashPatternId} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={8} stroke="#475569" strokeWidth={1.4} opacity={0.55} />
            </pattern>
          </defs>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {wedgeTicks.map((tick) => <line key={tick} x1={0} x2={innerWidth} y1={yScale(tick)} y2={yScale(tick)} stroke="#e7eaf0" />)}
            <line x1={0} x2={innerWidth} y1={yScale(0)} y2={yScale(0)} stroke="#697386" />
            {(() => {
              const factualFillPoints = [
                ...wedgeLines.filter((point) => point.factual != null).map((point) => `${xScale(point.year)},${yScale(point.factual ?? 0)}`),
                ...wedgeLines.filter((point) => point.factual != null).reverse().map((point) => `${xScale(point.year)},${yScale(0)}`),
              ].join(' ')
              return (
                <>
                  <polygon points={factualFillPoints} fill="#64748b" opacity={0.1} pointerEvents="none" />
                  <polygon points={factualFillPoints} fill={`url(#${factualHashPatternId})`} opacity={0.65} pointerEvents="none" />
                </>
              )
            })()}
            {spec.series.flatMap((series) => (['positive', 'negative'] as const).map((sign) => {
              const segment = wedgeCells.filter((cell) => cell.key === series.key && !cell.isMissing && cell.sign === sign)
              if (segment.length === 0) return null
              const top = segment.map((cell) => `${xScale(cell.year)},${yScale(cell.y1)}`)
              const bottom = [...segment].reverse().map((cell) => `${xScale(cell.year)},${yScale(cell.y0)}`)
              return <polygon key={`${series.key}-${sign}`} points={[...top, ...bottom].join(' ')} fill={colorForKey(spec, series.key)} opacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.76} stroke={inspection.activeSeriesKey === series.key ? '#111827' : 'none'} />
            }))}
            <polyline points={wedgeLines.filter((point) => point.counterfactual != null).map((point) => `${xScale(point.year)},${yScale(point.counterfactual ?? 0)}`).join(' ')} fill="none" stroke="#0f172a" strokeWidth={3} strokeDasharray="6 4" pointerEvents="none" />
            <polyline points={wedgeLines.filter((point) => point.factual != null).map((point) => `${xScale(point.year)},${yScale(point.factual ?? 0)}`).join(' ')} fill="none" stroke="#dc2626" strokeWidth={3.2} pointerEvents="none" />
            {selectedYear != null && <line className="cursor-line" x1={xScale(selectedYear)} x2={xScale(selectedYear)} y1={0} y2={innerHeight} />}
            {wedgeTicks.map((tick) => <text key={tick} x={-4} y={yScale(tick) + 3} textAnchor="end" fontSize={tokens.axisFontSize} fill="#52606d">{tick}</text>)}
            {xTicks.map((tick) => <text key={tick} x={xScale(tick)} y={innerHeight + 14} textAnchor="middle" fontSize={tokens.axisFontSize} fill="#52606d">{tick}</text>)}
          </g>
        </svg>
      )
    }

    return (
      <div className="recharts-wrap" onPointerMove={(event) => inspectWedge(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())} onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))} onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={wedgeData} margin={tokens.chartMargin}>
            <defs>
              <pattern id={factualHashPatternId} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={8} stroke="#475569" strokeWidth={1.4} opacity={0.55} />
              </pattern>
            </defs>
            <CartesianGrid stroke="#e7eaf0" vertical={false} />
            <XAxis dataKey="year" type="number" domain={barDomain} ticks={xTicks} tick={{ fontSize: tokens.axisFontSize }} interval={0} />
            <YAxis domain={wedgeDomain} ticks={wedgeTicks} tick={{ fontSize: tokens.axisFontSize }} width={tokens.chartMargin.left - 2} />
            <Tooltip content={() => null} cursor={false} />
            <ReferenceLine y={0} stroke="#697386" />
            {selectedYear != null && <ReferenceLine x={selectedYear} stroke="#111827" strokeDasharray="3 3" />}
            <Bar dataKey="factualBackground" fill="#64748b" fillOpacity={0.08} stroke="#94a3b8" strokeOpacity={0.18} isAnimationActive={false} shape={renderVariableWidthBar} />
            <Bar dataKey="factualBackground" fill={`url(#${factualHashPatternId})`} fillOpacity={0.65} isAnimationActive={false} shape={renderVariableWidthBar} />
            {spec.series.map((series) => <Bar key={series.key} dataKey={series.key} fill={colorForKey(spec, series.key)} fillOpacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.78} isAnimationActive={false} shape={renderVariableWidthBar} />)}
            <Line type="linear" dataKey="counterfactual" dot={false} stroke="#0f172a" strokeWidth={3} strokeDasharray="6 4" isAnimationActive={false} />
            <Line type="linear" dataKey="factual" dot={false} stroke="#dc2626" strokeWidth={3.2} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="recharts-wrap" onPointerMove={(event) => inspect(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())} onPointerLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))} onClick={() => setInspection((state) => ({ ...state, pinnedYear: state.pinnedYear === state.activeYear ? null : state.activeYear }))}>
      <ResponsiveContainer width="100%" height="100%">
        <Component data={chartData} margin={tokens.chartMargin} stackOffset="sign">
          <CartesianGrid stroke="#e7eaf0" vertical={false} />
          <XAxis dataKey="year" type="number" domain={chartType === 'bar' ? barDomain : [Math.min(...years), Math.max(...years)]} ticks={xTicks} tick={{ fontSize: tokens.axisFontSize }} interval={0} />
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
              <Bar key={`${series.key}${suffix}`} dataKey={`${series.key}${suffix}`} stackId="stack" fill={colorForKey(spec, series.key)} fillOpacity={inspection.activeSeriesKey && inspection.activeSeriesKey !== series.key ? 0.18 : 0.78} isAnimationActive={false} shape={renderVariableWidthBar} />
            )))}
          {showTargets && <Line type="linear" dataKey="target" dot={false} stroke="#7c3aed" strokeDasharray="5 4" strokeWidth={1.4} isAnimationActive={false} />}
          {showNetLine && <Line type="linear" dataKey="net" dot={false} stroke="#111827" strokeWidth={1.5} isAnimationActive={false} />}
        </Component>
      </ResponsiveContainer>
    </div>
  )
}
