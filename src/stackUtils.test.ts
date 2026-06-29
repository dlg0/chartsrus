import { describe, expect, it } from 'vitest'
import { getSlice, middleTruncate, nearestYearFromX, rankSeriesByImportance, signedBands, stackBySign, stackCellAtPoint } from './stackUtils'
import type { StackChartSpec, StackDatum, StackSeriesMeta } from './types'

const series: StackSeriesMeta[] = [
  { key: 'a', label: 'A long canonical label', shortLabel: 'A' },
  { key: 'b', label: 'B long canonical label', shortLabel: 'B' },
  { key: 'c', label: 'C long canonical label', shortLabel: 'C' },
]

const rows: StackDatum[] = [
  { year: 2025, a: 10, b: -4, c: null },
  { year: 2030, a: -3, b: 0, c: 2 },
]

describe('stack utilities', () => {
  it('stacks positive values upward and negative values downward from zero', () => {
    const cells = stackBySign(rows, series)
    expect(cells.find((cell) => cell.year === 2025 && cell.key === 'a')).toMatchObject({ y0: 0, y1: 10, sign: 'positive' })
    expect(cells.find((cell) => cell.year === 2025 && cell.key === 'b')).toMatchObject({ y0: 0, y1: -4, sign: 'negative' })
  })

  it('computes positive, negative, net, and gross totals', () => {
    const slice = getSlice(stackBySign(rows, series), 2025)
    expect(slice.positiveTotal).toBe(10)
    expect(slice.negativeTotal).toBe(-4)
    expect(slice.netTotal).toBe(6)
    expect(slice.grossTotal).toBe(14)
  })

  it('marks null values as missing without misleading geometry', () => {
    expect(stackBySign(rows, series).find((cell) => cell.year === 2025 && cell.key === 'c')).toMatchObject({ value: 0, y0: 0, y1: 0, isMissing: true, sign: 'zero' })
  })

  it('marks zero values as zero', () => {
    expect(stackBySign(rows, series).find((cell) => cell.year === 2030 && cell.key === 'b')).toMatchObject({ value: 0, sign: 'zero', isMissing: false })
  })

  it('handles sign-changing series in different years', () => {
    const cells = stackBySign(rows, series)
    expect(cells.find((cell) => cell.year === 2025 && cell.key === 'a')?.sign).toBe('positive')
    expect(cells.find((cell) => cell.year === 2030 && cell.key === 'a')?.sign).toBe('negative')
  })

  it('places sign-changing series nearest zero on either side of the stack', () => {
    const cells = stackBySign([
      { year: 2025, a: 10, b: 5, c: -2 },
      { year: 2030, a: -3, b: 6, c: -4 },
    ], series)
    expect(cells.find((cell) => cell.year === 2025 && cell.key === 'a')).toMatchObject({ y0: 0, y1: 10 })
    expect(cells.find((cell) => cell.year === 2030 && cell.key === 'a')).toMatchObject({ y0: 0, y1: -3 })
  })

  it('finds the stack cell under a pointer y position for reverse chart-to-legend focus', () => {
    const cells = stackBySign([{ year: 2025, a: 10, b: 5, c: -4 }], series)
    const yScale = (value: number) => 100 - value * 10
    expect(stackCellAtPoint(cells, 2025, 25, yScale)?.key).toBe('a')
    expect(stackCellAtPoint(cells, 2025, 115, yScale)?.key).toBe('c')
    expect(stackCellAtPoint(cells, 2025, 180, yScale)).toBeNull()
  })

  it('selects nearest year by scaled position for irregular years', () => {
    const years = [2025, 2026, 2027, 2030, 2035, 2040, 2050]
    const scale = (year: number) => (year - 2025) * 10
    expect(nearestYearFromX(42, years, scale)).toBe(2030)
    expect(nearestYearFromX(128, years, scale)).toBe(2040)
  })

  it('ranks series by sum of absolute values', () => {
    const spec: StackChartSpec = { title: 't', unit: 'PJ', x: { key: 'year', label: 'Year', type: 'number' }, series, data: rows, options: { density: 'dense', stack: 'diverging', interpolation: 'linear', legendMode: 'compact', inspectionMode: 'slice', maxInlineLegendItems: 2, maxInspectorRows: 2 } }
    expect(rankSeriesByImportance(spec).map((item) => item.key)).toEqual(['a', 'b', 'c'])
  })

  it('middle truncates while preserving start and end', () => {
    expect(middleTruncate('Electricity generation utility solar photovoltaic', 18)).toBe('Electrici…ovoltaic')
  })
})

describe('signedBands', () => {
  const bandSeries: StackSeriesMeta[] = [
    { key: 'a', label: 'A', shortLabel: 'A' },
    { key: 'b', label: 'B', shortLabel: 'B' },
    { key: 'c', label: 'C', shortLabel: 'C' },
  ]
  const bandRows: StackDatum[] = [
    { year: 2025, a: -2, b: 10, c: -3 },
    { year: 2030, a: 4, b: 8, c: -5 },
  ]
  const bands = signedBands(bandRows, bandSeries)
  const band = (key: string, sign: 'positive' | 'negative') => bands.find((item) => item.key === key && item.sign === sign)

  it('emits one band per sign that a series actually occupies', () => {
    expect(band('a', 'positive')).toBeDefined() // a is sign-changing: both signs
    expect(band('a', 'negative')).toBeDefined()
    expect(band('b', 'negative')).toBeUndefined() // b is purely positive
    expect(band('c', 'positive')).toBeUndefined()
  })

  it('spans every year so bands tile without per-segment gaps', () => {
    expect(band('a', 'positive')?.points.map((point) => point.year)).toEqual([2025, 2030])
  })

  it('stacks neighbours edge-to-edge: a lower band top equals the next band base', () => {
    // a is stacked nearest zero, so b sits directly on top of a on the positive side.
    expect(band('a', 'positive')?.points[1]).toMatchObject({ year: 2030, y0: 0, y1: 4 })
    expect(band('b', 'positive')?.points[1]).toMatchObject({ year: 2030, y0: 4, y1: 12 })
  })

  it('collapses to zero thickness at the baseline where a series changes sign', () => {
    // a is negative in 2025 (so its positive band is flat on zero) and positive in 2030 (negative flat).
    expect(band('a', 'positive')?.points[0]).toMatchObject({ year: 2025, y0: 0, y1: 0 })
    expect(band('a', 'negative')?.points[1]).toMatchObject({ year: 2030, y0: 0, y1: 0 })
  })
})
