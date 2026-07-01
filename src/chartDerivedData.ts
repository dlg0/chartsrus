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

export type CounterfactualCell = {
  year: number
  key: string
  label: string
  shortLabel: string
  value: number
  y0: number
  y1: number
  sign: 'positive' | 'negative' | 'zero'
  isMissing: boolean
}

export function counterfactualLineData(data: StackDatum[], series: StackSeriesMeta[]) {
  return data.map((row) => {
    const counterfactual = row.counterfactual ?? null
    const factual = row.factual ?? (counterfactual == null ? null : counterfactual + series.reduce((sum, item) => sum + (row[item.key] ?? 0), 0))
    return { year: row.year, counterfactual, factual }
  })
}

export function counterfactualCells(data: StackDatum[], series: StackSeriesMeta[]): CounterfactualCell[] {
  return data.flatMap((row) => {
    const baseline = row.counterfactual
    if (baseline == null) {
      return series.map((meta) => ({
        year: row.year,
        key: meta.key,
        label: meta.label,
        shortLabel: meta.shortLabel,
        value: 0,
        y0: 0,
        y1: 0,
        sign: 'zero' as const,
        isMissing: true,
      }))
    }

    let positiveBase = baseline
    let negativeBase = baseline
    return series.map((meta) => {
      const rawValue = row[meta.key]
      const isMissing = rawValue == null
      const value = isMissing ? 0 : rawValue
      const sign: CounterfactualCell['sign'] = value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero'
      let y0 = baseline
      let y1 = baseline
      if (!isMissing && value > 0) {
        y0 = positiveBase
        y1 = positiveBase + value
        positiveBase = y1
      } else if (!isMissing && value < 0) {
        y0 = negativeBase
        y1 = negativeBase + value
        negativeBase = y1
      }
      return { year: row.year, key: meta.key, label: meta.label, shortLabel: meta.shortLabel, value, y0, y1, sign, isMissing }
    })
  })
}

export function counterfactualExtent(cells: CounterfactualCell[], lines: ReturnType<typeof counterfactualLineData>): [number, number] {
  const values = [
    0,
    ...cells.flatMap((cell) => [cell.y0, cell.y1]),
    ...lines.flatMap((point) => [point.counterfactual, point.factual]).filter((value): value is number => typeof value === 'number'),
  ]
  return [Math.min(...values), Math.max(...values)]
}

export function lineExtent(data: StackDatum[], series: StackSeriesMeta[]): [number, number] {
  const values = data.flatMap((row) => series.map((item) => row[item.key]).filter((value): value is number => typeof value === 'number'))
  return [Math.min(0, ...values), Math.max(0, ...values)]
}
