import type { StackCell } from './types'

export type BandRing = { x: number[]; y: number[] }

// Build a closed polygon ring for one contiguous same-sign segment, suitable for a Plotly
// scatter trace with fill: 'toself'. The ring walks the upper edge (y1) forward and the lower
// edge (y0) back, so the explicit StackCell y0/y1 geometry is the source of truth rather than
// Plotly's own stacking. Step interpolation inserts the holding vertices itself, so the trace
// can keep line.shape: 'linear' and still render a stepped band.
export function bandRing(segment: StackCell[], interpolation: 'linear' | 'step'): BandRing {
  if (segment.length === 0) return { x: [], y: [] }
  const top = edgePath(segment, 'y1', interpolation)
  const bottom = edgePath(segment, 'y0', interpolation)
  bottom.x.reverse()
  bottom.y.reverse()
  return { x: [...top.x, ...bottom.x], y: [...top.y, ...bottom.y] }
}

function edgePath(segment: StackCell[], key: 'y0' | 'y1', interpolation: 'linear' | 'step'): BandRing {
  const x: number[] = []
  const y: number[] = []
  segment.forEach((cell, index) => {
    x.push(cell.year)
    y.push(cell[key])
    if (interpolation === 'step' && index < segment.length - 1) {
      x.push(segment[index + 1].year)
      y.push(cell[key])
    }
  })
  return { x, y }
}
