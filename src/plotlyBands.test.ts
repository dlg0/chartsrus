import { describe, expect, it } from 'vitest'
import { bandRing, signedBands } from './plotlyBands'
import type { StackCell, StackDatum, StackSeriesMeta } from './types'

function cell(year: number, y0: number, y1: number): StackCell {
  return { year, key: 'a', label: 'A', shortLabel: 'A', value: y1 - y0, y0, y1, sign: y1 >= y0 ? 'positive' : 'negative', isMissing: false }
}

describe('bandRing', () => {
  it('walks the upper edge forward and the lower edge back for a linear band', () => {
    const ring = bandRing([cell(2025, 0, 10), cell(2030, 0, 14)], 'linear')
    expect(ring.x).toEqual([2025, 2030, 2030, 2025])
    expect(ring.y).toEqual([10, 14, 0, 0])
  })

  it('inserts holding vertices so a stepped band stays rectangular between years', () => {
    const ring = bandRing([cell(2025, 0, 10), cell(2030, 0, 14)], 'step')
    // top: (2025,10) hold to (2030,10) then (2030,14); bottom reversed back along y0=0.
    expect(ring.x).toEqual([2025, 2030, 2030, 2030, 2030, 2025])
    expect(ring.y).toEqual([10, 10, 14, 0, 0, 0])
  })

  it('returns an empty ring for an empty segment', () => {
    expect(bandRing([], 'linear')).toEqual({ x: [], y: [] })
  })
})

describe('signedBands', () => {
  const series: StackSeriesMeta[] = [
    { key: 'a', label: 'A', shortLabel: 'A' },
    { key: 'b', label: 'B', shortLabel: 'B' },
    { key: 'c', label: 'C', shortLabel: 'C' },
  ]
  const rows: StackDatum[] = [
    { year: 2025, a: -2, b: 10, c: -3 },
    { year: 2030, a: 4, b: 8, c: -5 },
  ]
  const bands = signedBands(rows, series)
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
