import { useMemo, useState } from 'react'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { middleTruncate, rankSeriesByImportance } from '../stackUtils'
import type { InspectionState, StackChartSpec } from '../types'

type Props = {
  spec: StackChartSpec
  activeSeriesKey: string | null
  isolatedSeriesKeys: Set<string>
  forceFull?: boolean
  position?: 'top' | 'right' | 'bottom'
  setIsolatedSeriesKeys: React.Dispatch<React.SetStateAction<Set<string>>>
  setInspection: React.Dispatch<React.SetStateAction<InspectionState>>
}

export function CompactLegend({ spec, activeSeriesKey, isolatedSeriesKeys, forceFull = false, position = 'top', setIsolatedSeriesKeys, setInspection }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const tokens = densityTokens[spec.options.density]
  const ranked = useMemo(() => rankSeriesByImportance(spec), [spec])
  const inline = forceFull ? ranked : ranked.slice(0, spec.options.maxInlineLegendItems)
  const filtered = ranked.filter((series) => `${series.shortLabel} ${series.label}`.toLowerCase().includes(query.toLowerCase()))

  function toggleIsolated(key: string) {
    setIsolatedSeriesKeys((previous) => {
      if (previous.size === 0) return new Set([key])
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function isolateOnly(key: string) {
    setIsolatedSeriesKeys(new Set([key]))
  }

  function legendClass(key: string) {
    return [
      'legend-pill',
      isolatedSeriesKeys.size > 0 && isolatedSeriesKeys.has(key) ? 'isolated' : '',
      activeSeriesKey === key ? 'active' : '',
    ].filter(Boolean).join(' ')
  }

  return (
    <div className={['legend-shell', forceFull ? 'full' : '', position !== 'top' ? position : ''].filter(Boolean).join(' ')} style={{ height: forceFull || position === 'right' ? 'auto' : tokens.legendHeight, fontSize: tokens.fontSize }}>
      <div className={forceFull ? 'compact-legend full' : 'compact-legend'} aria-label="Compact legend">
        <span className="legend-label">Legend</span>
        {inline.map((series) => (
          <button
            type="button"
            key={series.key}
            className={legendClass(series.key)}
            aria-label={`${series.label}. Double click to isolate; click while isolated to add or remove.`}
            onClick={() => isolatedSeriesKeys.size > 0 && toggleIsolated(series.key)}
            onDoubleClick={() => isolateOnly(series.key)}
            onMouseEnter={() => setInspection((state) => ({ ...state, activeSeriesKey: series.key }))}
            onFocus={() => setInspection((state) => ({ ...state, activeSeriesKey: series.key }))}
            onMouseLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))}
            onBlur={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))}
          >
            <span className="chip" style={{ background: colorForKey(spec, series.key) }} />
            {middleTruncate(series.shortLabel, 18)}
          </button>
        ))}
        {!forceFull && ranked.length > inline.length && <button type="button" className="legend-more" onClick={() => setOpen(true)}>+{ranked.length - inline.length} more</button>}
        {isolatedSeriesKeys.size > 0 && <button type="button" className="legend-more" onClick={() => setIsolatedSeriesKeys(new Set())}>show all</button>}
      </div>
      {open && (
        <div className="legend-drawer" role="dialog" aria-label="All series legend">
          <div className="drawer-header">
            <strong>All series</strong>
            <button type="button" onClick={() => setOpen(false)}>close</button>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter series" />
          <div className="drawer-list">
            {filtered.map((series) => (
              <button
                type="button"
                className={activeSeriesKey === series.key ? 'drawer-row active' : 'drawer-row'}
                key={series.key}
                onClick={() => isolatedSeriesKeys.size > 0 && toggleIsolated(series.key)}
                onDoubleClick={() => isolateOnly(series.key)}
                onMouseEnter={() => setInspection((state) => ({ ...state, activeSeriesKey: series.key }))}
                onFocus={() => setInspection((state) => ({ ...state, activeSeriesKey: series.key }))}
                onMouseLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))}
                onBlur={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))}
              >
                <span className="chip" style={{ background: colorForKey(spec, series.key) }} />
                <span><strong>{series.shortLabel}{isolatedSeriesKeys.has(series.key) ? ' · isolated' : ''}</strong><small>{series.label}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
