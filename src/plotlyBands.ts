import type { BandPoint } from './stackUtils'

export type BandRing = { x: number[]; y: number[] }

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
