import { useMemo, useState } from 'react'
import { colorForKey } from '../colors'
import { densityTokens } from '../density'
import { formatValue, getSlice, middleTruncate, stackBySign } from '../stackUtils'
import type { InspectionState, StackCell, StackChartSpec } from '../types'

type Props = {
  spec: StackChartSpec
  selectedYear: number | null
  activeSeriesKey: string | null
  isOpen: boolean
  forceFull?: boolean
  onOpenChange: (open: boolean) => void
  setInspection: React.Dispatch<React.SetStateAction<InspectionState>>
}

function rowShare(cell: StackCell, positiveTotal: number, negativeTotal: number, grossTotal: number) {
  if (cell.value > 0 && positiveTotal > 0) return `${Math.round((cell.value / positiveTotal) * 100)}% of +`
  if (cell.value < 0 && negativeTotal < 0) return `${Math.round((Math.abs(cell.value) / Math.abs(negativeTotal)) * 100)}% of -`
  if (grossTotal > 0 && cell.value !== 0) return `${Math.round((Math.abs(cell.value) / grossTotal) * 100)}% gross`
  return '—'
}

export function StackSliceInspector({ spec, selectedYear, activeSeriesKey, isOpen, forceFull = false, onOpenChange, setInspection }: Props) {
  const [showAllRows, setShowAllRows] = useState(false)
  const tokens = densityTokens[spec.options.density]
  const cells = useMemo(() => stackBySign(spec.data, spec.series), [spec])
  const slice = selectedYear == null ? null : getSlice(cells, selectedYear)
  const rows = useMemo(() => {
    if (!slice) return []
    return [...slice.cells]
      .filter((cell) => !cell.isMissing)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  }, [slice])
  const activeRow = rows.find((cell) => cell.key === activeSeriesKey) ?? rows[0]
  const inspectorOpen = isOpen || forceFull
  const visibleRows = showAllRows || forceFull ? rows : rows.slice(0, spec.options.maxInspectorRows)
  const hiddenCount = Math.max(0, rows.length - visibleRows.length)

  if (!slice) {
    return <aside className="inspector empty"><strong>Inspector</strong><span>Move over the plot to inspect a model-year slice.</span></aside>
  }

  if (!inspectorOpen) {
    return (
      <aside className="inspector collapsed" style={{ fontSize: tokens.fontSize, '--row-height': `${tokens.rowHeight}px` } as React.CSSProperties}>
        <button type="button" className="inspector-strip" onClick={() => onOpenChange(true)} aria-label="Expand inspector">
          <strong>Inspector · {slice.year}</strong>
          <span>Net {formatValue(slice.netTotal, spec.unit)}</span>
          <span>+{formatValue(slice.positiveTotal, spec.unit)} / {formatValue(slice.negativeTotal, spec.unit)}</span>
          {activeRow && <span className="strip-active"><span className="chip" style={{ background: colorForKey(spec, activeRow.key) }} /> {activeSeriesKey ? 'Active' : 'Top'}: {middleTruncate(activeRow.shortLabel, 18)} {formatValue(activeRow.value, spec.unit)}</span>}
        </button>
      </aside>
    )
  }

  return (
    <aside className="inspector" style={{ fontSize: tokens.fontSize, '--row-height': `${tokens.rowHeight}px` } as React.CSSProperties}>
      <div className="inspector-topline">
        <strong>Inspector · {slice.year}{forceFull ? ' · full' : ''}</strong>
        <span className="inspector-actions">
          <button type="button" onClick={() => setShowAllRows((value) => !value)}>{showAllRows || forceFull ? 'fewer rows' : 'all rows'}</button>
          {!forceFull && <button type="button" onClick={() => onOpenChange(false)}>collapse</button>}
        </span>
      </div>
      <div className="totals-grid">
        <span>Net</span><strong>{formatValue(slice.netTotal, spec.unit)}</strong>
        <span>+</span><strong>{formatValue(slice.positiveTotal, spec.unit)}</strong>
        <span>-</span><strong>{formatValue(slice.negativeTotal, spec.unit)}</strong>
        <span>Gross</span><strong>{formatValue(slice.grossTotal, spec.unit)}</strong>
      </div>
      <div className="inspector-rows">
        {visibleRows.map((cell) => (
          <button
            type="button"
            className={activeSeriesKey === cell.key ? 'inspector-row active' : 'inspector-row'}
            key={cell.key}
            onMouseEnter={() => setInspection((state) => ({ ...state, activeSeriesKey: cell.key }))}
            onFocus={() => setInspection((state) => ({ ...state, activeSeriesKey: cell.key }))}
            onMouseLeave={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))}
            onBlur={() => setInspection((state) => ({ ...state, activeSeriesKey: null }))}
            aria-label={cell.label}
          >
            <span className="chip" style={{ background: colorForKey(spec, cell.key) }} />
            <span className="row-label">{middleTruncate(cell.shortLabel, 22)}</span>
            <span className={cell.value < 0 ? 'negative value' : 'value'}>{formatValue(cell.value, spec.unit)}</span>
            <span className="share">{rowShare(cell, slice.positiveTotal, slice.negativeTotal, slice.grossTotal)}</span>
          </button>
        ))}
        {hiddenCount > 0 && <button type="button" className="more-row" onClick={() => setShowAllRows(true)}>+{hiddenCount} more</button>}
      </div>
    </aside>
  )
}
