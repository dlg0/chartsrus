import type { ChartViewMode, StackChartSpec, StackDatum, StackSeriesMeta } from './types'

export function specForViewMode(spec: StackChartSpec, mode: ChartViewMode): StackChartSpec {
  if (mode === 'regular') return spec
  const totals = new Map<string, number>()
  for (const series of spec.series) totals.set(series.key, 0)

  const data = spec.data.map((row) => {
    const next: StackDatum = { year: row.year }
    for (const series of spec.series) {
      const value = row[series.key]
      if (value == null) {
        next[series.key] = null
      } else {
        const total = (totals.get(series.key) ?? 0) + value
        totals.set(series.key, total)
        next[series.key] = total
      }
    }
    return next
  })

  return { ...spec, title: `${spec.title} cumulative`, data }
}

export function netLineData(data: StackDatum[], series: StackSeriesMeta[]) {
  return data.map((row) => ({
    year: row.year,
    net: series.reduce((sum, item) => sum + (row[item.key] ?? 0), 0),
  }))
}

export function targetLineData(years: number[], mode: ChartViewMode) {
  const annual = years.map((year) => {
    const anchors = [
      [2025, 410],
      [2030, 245],
      [2035, 155],
      [2040, 80],
      [2050, 0],
      [2060, -55],
      [2070, -95],
    ] as const
    for (let index = 1; index < anchors.length; index += 1) {
      const [x0, y0] = anchors[index - 1]
      const [x1, y1] = anchors[index]
      if (year <= x1) {
        const t = (year - x0) / (x1 - x0)
        return { year, target: y0 + (y1 - y0) * t }
      }
    }
    return { year, target: anchors[anchors.length - 1][1] }
  })

  if (mode === 'regular') return annual
  let cumulative = 0
  return annual.map((point) => {
    cumulative += point.target
    return { year: point.year, target: cumulative }
  })
}
