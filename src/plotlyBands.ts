import { getSignChangingSeriesKeys } from './stackUtils'
import type { StackDatum, StackSeriesMeta } from './types'

export type BandPoint = { year: number; y0: number; y1: number }
export type BandRing = { x: number[]; y: number[] }
export type SignedBand = { key: string; label: string; shortLabel: string; sign: 'positive' | 'negative'; points: BandPoint[] }

// Build a closed polygon ring for one band, suitable for a Plotly scatter trace with fill: 'toself'.
// The ring walks the upper edge (y1) forward and the lower edge (y0) back, so the explicit y0/y1
// geometry is the source of truth rather than Plotly's own stacking. Step interpolation inserts the
// holding vertices itself, so the trace can keep line.shape: 'linear' and still render a stepped band.
export function bandRing(points: BandPoint[], interpolation: 'linear' | 'step'): BandRing {
  if (points.length === 0) return { x: [], y: [] }
  const top = edgePath(points, 'y1', interpolation)
  const bottom = edgePath(points, 'y0', interpolation)
  bottom.x.reverse()
  bottom.y.reverse()
  return { x: [...top.x, ...bottom.x], y: [...top.y, ...bottom.y] }
}

function edgePath(points: BandPoint[], key: 'y0' | 'y1', interpolation: 'linear' | 'step'): BandRing {
  const x: number[] = []
  const y: number[] = []
  points.forEach((point, index) => {
    x.push(point.year)
    y.push(point[key])
    if (interpolation === 'step' && index < points.length - 1) {
      x.push(points[index + 1].year)
      y.push(point[key])
    }
  })
  return { x, y }
}

// Build full-width diverging stack bands that tile without gaps. Each series keeps one band per sign
// that spans every year, collapsing to zero thickness (y0 == y1 at the running base) where the series
// is the other sign or zero. Because every band shares the same year grid and meets its neighbour's
// edge at the base, sign-changing series and series that decay to zero taper smoothly into the baseline
// instead of leaving the triangular gaps that per-segment polygons produce. Bands break only at missing
// values, so genuine data gaps are still not bridged. Sign-changing series stack nearest zero, matching
// the shared stack transform.
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
