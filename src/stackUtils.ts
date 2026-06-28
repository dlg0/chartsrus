import type { StackCell, StackChartSpec, StackDatum, StackSeriesMeta, StackSlice } from './types'

export function stackBySign(rows: StackDatum[], series: StackSeriesMeta[]): StackCell[] {
  const signChangingKeys = getSignChangingSeriesKeys(rows, series)
  const stackOrder = [
    ...series.filter((meta) => signChangingKeys.has(meta.key)),
    ...series.filter((meta) => !signChangingKeys.has(meta.key)),
  ]

  return rows.flatMap((row) => {
    let positiveBase = 0
    let negativeBase = 0

    return stackOrder.map((meta) => {
      const rawValue = row[meta.key]
      const isMissing = rawValue == null
      const value = isMissing ? 0 : rawValue
      const sign: StackCell['sign'] = value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero'
      let y0 = 0
      let y1 = 0

      if (!isMissing && value > 0) {
        y0 = positiveBase
        y1 = positiveBase + value
        positiveBase = y1
      } else if (!isMissing && value < 0) {
        y0 = negativeBase
        y1 = negativeBase + value
        negativeBase = y1
      }

      return {
        year: row.year,
        key: meta.key,
        label: meta.label,
        shortLabel: meta.shortLabel,
        group: meta.group,
        value,
        y0,
        y1,
        sign,
        isMissing,
      }
    })
  })
}

export function getSignChangingSeriesKeys(rows: StackDatum[], series: StackSeriesMeta[]): Set<string> {
  const keys = new Set<string>()
  for (const meta of series) {
    let hasPositive = false
    let hasNegative = false
    for (const row of rows) {
      const value = row[meta.key]
      if (value == null) continue
      if (value > 0) hasPositive = true
      if (value < 0) hasNegative = true
    }
    if (hasPositive && hasNegative) keys.add(meta.key)
  }
  return keys
}

export function getSlice(cells: StackCell[], year: number): StackSlice {
  const sliceCells = cells.filter((cell) => cell.year === year)
  const positiveTotal = sliceCells.reduce((sum, cell) => sum + Math.max(0, cell.value), 0)
  const negativeTotal = sliceCells.reduce((sum, cell) => sum + Math.min(0, cell.value), 0)
  return {
    year,
    cells: sliceCells,
    positiveTotal,
    negativeTotal,
    netTotal: positiveTotal + negativeTotal,
    grossTotal: positiveTotal + Math.abs(negativeTotal),
  }
}

export function rankSeriesByImportance(spec: StackChartSpec): StackSeriesMeta[] {
  const totals = new Map<string, number>()
  for (const series of spec.series) totals.set(series.key, 0)
  for (const row of spec.data) {
    for (const series of spec.series) {
      totals.set(series.key, (totals.get(series.key) ?? 0) + Math.abs(row[series.key] ?? 0))
    }
  }
  return [...spec.series].sort((a, b) => (totals.get(b.key) ?? 0) - (totals.get(a.key) ?? 0))
}

export function formatValue(value: number, unit: string): string {
  const abs = Math.abs(value)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2
  return `${value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: abs > 0 && abs < 10 ? 1 : 0 })} ${unit}`
}

export function middleTruncate(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label
  if (maxChars <= 3) return '.'.repeat(maxChars)
  const available = maxChars - 1
  const startLength = Math.ceil(available / 2)
  const endLength = Math.floor(available / 2)
  return `${label.slice(0, startLength)}…${label.slice(label.length - endLength)}`
}

export function nearestYearFromX(
  pointerX: number,
  years: number[],
  xScale: (year: number) => number,
): number {
  if (years.length === 0) throw new Error('nearestYearFromX requires at least one year')
  return years.reduce((nearest, year) => {
    const distance = Math.abs(xScale(year) - pointerX)
    const nearestDistance = Math.abs(xScale(nearest) - pointerX)
    return distance < nearestDistance ? year : nearest
  }, years[0])
}

export function yearsFromSpec(spec: StackChartSpec): number[] {
  return spec.data.map((row) => row.year)
}

export function stackExtent(cells: StackCell[]): [number, number] {
  const values = cells.flatMap((cell) => [cell.y0, cell.y1])
  return [Math.min(0, ...values), Math.max(0, ...values)]
}

export function stackCellAtPoint(
  cells: StackCell[],
  year: number,
  pointerY: number,
  yScale: (value: number) => number,
): StackCell | null {
  const slice = cells
    .filter((cell) => cell.year === year && !cell.isMissing && cell.sign !== 'zero')
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  return slice.find((cell) => {
    const y0 = yScale(cell.y0)
    const y1 = yScale(cell.y1)
    const top = Math.min(y0, y1)
    const bottom = Math.max(y0, y1)
    return pointerY >= top && pointerY <= bottom
  }) ?? null
}

export function contiguousSignSegments(cells: StackCell[], sign: 'positive' | 'negative'): StackCell[][] {
  const segments: StackCell[][] = []
  let current: StackCell[] = []

  for (const cell of cells) {
    if (!cell.isMissing && cell.sign === sign) {
      current.push(cell)
    } else if (current.length > 0) {
      segments.push(current)
      current = []
    }
  }

  if (current.length > 0) segments.push(current)
  return segments
}
