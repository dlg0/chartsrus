import type { StackChartSpec } from './types'

const palette = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc949',
  '#af7aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ab',
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
  '#3b5b92',
  '#b85c38',
]

export function colorForKey(spec: StackChartSpec, key: string) {
  const index = spec.series.findIndex((series) => series.key === key)
  return palette[Math.max(0, index) % palette.length]
}
