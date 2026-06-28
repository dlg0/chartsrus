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
