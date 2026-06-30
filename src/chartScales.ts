export function visibleYearTicks(years: number[], width: number): number[] {
  if (width >= 700) return years
  const required = new Set([years[0], years[years.length - 1]])
  const preferred = years.filter((year) => year % 10 === 0 || year === 2035 || year === 2050)
  return [...new Set([...years.filter((year) => required.has(year)), ...preferred])].sort((a, b) => a - b)
}

export function readableYTicks(min: number, max: number): number[] {
  const span = max - min
  const step = Math.max(10, Math.ceil(span / 4 / 10) * 10)
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let value = start; value <= max; value += step) ticks.push(value)
  if (!ticks.includes(0) && min < 0 && max > 0) ticks.push(0)
  return ticks.sort((a, b) => a - b)
}

export type BarXBand = {
  year: number
  x0: number
  x1: number
}

export function barXDomain(years: number[]): [number, number] {
  if (years.length === 0) return [0, 1]
  if (years.length === 1) return [years[0] - 0.5, years[0] + 0.5]
  const firstGap = years[1] - years[0]
  const lastGap = years[years.length - 1] - years[years.length - 2]
  return [years[0] - firstGap / 2, years[years.length - 1] + lastGap / 2]
}

export function barXBands(years: number[]): BarXBand[] {
  if (years.length === 0) return []
  if (years.length === 1) return [{ year: years[0], x0: years[0] - 0.5, x1: years[0] + 0.5 }]

  return years.map((year, index) => {
    const previous = years[index - 1]
    const next = years[index + 1]
    return {
      year,
      x0: previous == null ? year - (next - year) / 2 : (previous + year) / 2,
      x1: next == null ? year + (year - previous) / 2 : (year + next) / 2,
    }
  })
}
