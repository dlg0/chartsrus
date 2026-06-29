import { describe, expect, it } from 'vitest'
import { bandRing } from './plotlyBands'
import type { StackCell } from './types'

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
