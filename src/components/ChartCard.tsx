import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { toPng } from 'html-to-image'
import { specForViewMode } from '../chartDerivedData'
import { densityTokens } from '../density'
import { stackBySign, yearsFromSpec } from '../stackUtils'
import type { ChartType, ChartViewMode, InspectionState, RendererProps, StackChartSpec, StackDatum } from '../types'
import { useMeasure } from '../useMeasure'
import { CompactLegend } from './CompactLegend'
import { StackSliceInspector } from './StackSliceInspector'

type Props = {
  name: string
  note: string
  spec: StackChartSpec
  chartType: ChartType
  Renderer: React.ComponentType<RendererProps>
}

export function ChartCard({ name, note, spec, chartType, Renderer }: Props) {
  const years = useMemo(() => yearsFromSpec(spec), [spec])
  const [inspection, setInspection] = useState<InspectionState>({ activeYear: years[Math.floor(years.length / 2)] ?? null, pinnedYear: null, activeSeriesKey: null })
  const [isolatedSeriesKeys, setIsolatedSeriesKeys] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ChartViewMode>('regular')
  const [showNetLine, setShowNetLine] = useState(true)
  const [showTargets, setShowTargets] = useState(true)
  const [forceFullExportLayout, setForceFullExportLayout] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const selectedYear = inspection.pinnedYear ?? inspection.activeYear
  const [plotRef, plotSize] = useMeasure<HTMLDivElement>()
  const exportRef = useRef<HTMLElement | null>(null)
  const tokens = densityTokens[spec.options.density]
  const isolatedSpec = useMemo<StackChartSpec>(() => {
    if (isolatedSeriesKeys.size === 0) return spec
    const isolatedSeries = spec.series.filter((series) => isolatedSeriesKeys.has(series.key))
    return {
      ...spec,
      series: isolatedSeries,
      data: spec.data.map((row) => {
        const isolatedRow: StackDatum = { year: row.year }
        for (const series of isolatedSeries) isolatedRow[series.key] = row[series.key]
        return isolatedRow
      }),
    }
  }, [isolatedSeriesKeys, spec])
  const renderSpec = useMemo(() => specForViewMode(isolatedSpec, viewMode), [isolatedSpec, viewMode])
  useMemo(() => stackBySign(renderSpec.data, renderSpec.series), [renderSpec])

  async function saveImage(full = false) {
    if (!exportRef.current) return
    if (full) {
      flushSync(() => setForceFullExportLayout(true))
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }
    const dataUrl = await toPng(exportRef.current, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true'),
    })
    if (full) flushSync(() => setForceFullExportLayout(false))
    const link = document.createElement('a')
    link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${chartType}${full ? '-full' : ''}.png`
    link.href = dataUrl
    link.click()
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setInspection((state) => ({ ...state, pinnedYear: null }))
        setToolsOpen(false)
        setInspectorOpen(false)
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      setInspection((state) => {
        const current = state.pinnedYear ?? state.activeYear ?? years[Math.floor(years.length / 2)]
        const index = Math.max(0, years.indexOf(current))
        const nextIndex = event.key === 'ArrowLeft' ? Math.max(0, index - 1) : Math.min(years.length - 1, index + 1)
        return state.pinnedYear == null ? { ...state, activeYear: years[nextIndex] } : { ...state, pinnedYear: years[nextIndex] }
      })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [years])

  useEffect(() => {
    if (inspection.pinnedYear != null) setInspectorOpen(true)
  }, [inspection.pinnedYear])

  return (
    <section ref={exportRef} className="chart-card" style={{ '--inspector-width': `${tokens.inspectorWidth}px`, '--header-height': `${tokens.headerHeight}px` } as React.CSSProperties}>
      <header className="chart-card-header">
        <div>
          <h2>{name}</h2>
          <p>{spec.title} · {spec.unit}{isolatedSeriesKeys.size > 0 ? ` · isolated ${isolatedSeriesKeys.size}/${spec.series.length}` : ''}</p>
        </div>
        <div className="chart-tools" data-export-ignore="true">
          <span>{inspection.pinnedYear == null ? 'hover selects' : `pinned ${inspection.pinnedYear}`}</span>
          <button type="button" onClick={() => setToolsOpen((open) => !open)} aria-expanded={toolsOpen}>tools</button>
          {toolsOpen && (
            <div className="tools-popover" role="dialog" aria-label={`${name} tools`}>
              <div className="tools-popover-header">
                <strong>Tools</strong>
                <button type="button" onClick={() => setToolsOpen(false)}>close</button>
              </div>
              <label>mode <select value={viewMode} onChange={(event) => setViewMode(event.target.value as ChartViewMode)}><option value="regular">regular</option><option value="cumulative">cumulative</option></select></label>
              <label><input type="checkbox" checked={showNetLine} onChange={(event) => setShowNetLine(event.target.checked)} /> show net line</label>
              <label><input type="checkbox" checked={showTargets} onChange={(event) => setShowTargets(event.target.checked)} /> show NDC overlay</label>
              <button type="button" onClick={() => void saveImage(false)}>save image</button>
              <button type="button" onClick={() => void saveImage(true)}>save full</button>
            </div>
          )}
        </div>
      </header>
      {isolatedSeriesKeys.size > 0 && <div className="isolation-banner">Only isolated traces are plotted. Click legend rows to add/remove traces, or use show all.</div>}
      <CompactLegend spec={spec} activeSeriesKey={inspection.activeSeriesKey} isolatedSeriesKeys={isolatedSeriesKeys} forceFull={forceFullExportLayout} setIsolatedSeriesKeys={setIsolatedSeriesKeys} setInspection={setInspection} />
      <div className="chart-card-body">
        <div className="plot-column">
          <div className="plot-host" ref={plotRef}>
            {plotSize.width > 20 && plotSize.height > 20 && (
              <Renderer spec={renderSpec} chartType={chartType} viewMode={viewMode} showNetLine={showNetLine} showTargets={showTargets} width={plotSize.width} height={plotSize.height} inspection={inspection} setInspection={setInspection} />
            )}
          </div>
        </div>
      </div>
      <StackSliceInspector spec={renderSpec} selectedYear={selectedYear} activeSeriesKey={inspection.activeSeriesKey} isOpen={inspectorOpen} forceFull={forceFullExportLayout} onOpenChange={setInspectorOpen} setInspection={setInspection} />
      <p className="renderer-note">{note}</p>
    </section>
  )
}
