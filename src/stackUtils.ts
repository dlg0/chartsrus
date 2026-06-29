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

export function seriesValueExtent(rows: StackDatum[], series: StackSeriesMeta[]): [number, number] {
  const values: number[] = []
  for (const row of rows) {
    for (const meta of series) {
      const value = row[meta.key]
      if (value != null) values.push(value)
    }
  }
  return [Math.min(0, ...values), Math.max(0, ...values)]
}

export type BandPoint = { year: number; y0: number; y1: number }
export type SignedBand = { key: string; label: string; shortLabel: string; sign: 'positive' | 'negative'; points: BandPoint[] }

// Build full-width diverging stack bands that tile without gaps. Each series keeps one band per sign
// that spans every year, collapsing to zero thickness (y0 == y1 at the running base) where the series
// is the other sign or zero. Because every band shares the year grid and meets its neighbour's edge at
// the base, sign-changing series and series that decay to zero taper smoothly into the baseline instead
// of leaving the triangular gaps that per-segment polygons produce. Bands break only at missing values,
// so genuine data gaps are still not bridged. Sign-changing series stack nearest zero, matching the
// shared stack transform. This is the source of truth for every renderer's diverging area geometry.
export function signedBands(rows: StackDatum[], series: StackSeriesMeta[]): SignedBand[] {
  const signChanging = getSignChangingSeriesKeys(rows, series)
  const order = [...series.filter((meta) => signChanging.has(meta.key)), ...series.filter((meta) => !signChanging.has(meta.key))]
  const positiveBase = new Map<number, number>()
  const negativeBase = new Map<number, number>()
  for (const row of rows) {
    positiveBase.set(row.year, 0)
    negativeBase.set(row.year, 0)
  }

  const bands: SignedBand[] = []
  for (const meta of order) {
    let positiveRun: BandPoint[] = []
    let negativeRun: BandPoint[] = []
    let positiveHasArea = false
    let negativeHasArea = false

    const flush = () => {
      if (positiveHasArea) bands.push({ key: meta.key, label: meta.label, shortLabel: meta.shortLabel, sign: 'positive', points: positiveRun })
      if (negativeHasArea) bands.push({ key: meta.key, label: meta.label, shortLabel: meta.shortLabel, sign: 'negative', points: negativeRun })
      positiveRun = []
      negativeRun = []
      positiveHasArea = false
      negativeHasArea = false
    }

    for (const row of rows) {
      const value = row[meta.key]
      if (value == null) {
        flush() // missing value: break the run so a real data gap is never bridged
        continue
      }
      const year = row.year
      const positive = positiveBase.get(year) ?? 0
      const negative = negativeBase.get(year) ?? 0
      if (value > 0) {
        positiveRun.push({ year, y0: positive, y1: positive + value })
        negativeRun.push({ year, y0: negative, y1: negative })
        positiveBase.set(year, positive + value)
        positiveHasArea = true
      } else if (value < 0) {
        positiveRun.push({ year, y0: positive, y1: positive })
        negativeRun.push({ year, y0: negative, y1: negative + value })
        negativeBase.set(year, negative + value)
        negativeHasArea = true
      } else {
        positiveRun.push({ year, y0: positive, y1: positive })
        negativeRun.push({ year, y0: negative, y1: negative })
      }
    }
    flush()
  }
  return bands
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
