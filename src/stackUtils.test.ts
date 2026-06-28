import { describe, expect, it } from 'vitest'
import { getSlice, middleTruncate, nearestYearFromX, rankSeriesByImportance, stackBySign, stackCellAtPoint } from './stackUtils'
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
