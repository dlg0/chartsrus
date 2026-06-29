import { useMemo, useState } from 'react'
import { ChartCard } from './components/ChartCard'
import { specWithOptions } from './fixture'
import { ObservablePlotStackChart } from './renderers/ObservablePlotStackChart'
import { PlotlyStackChart } from './renderers/PlotlyStackChart'
import { RechartsStackChart } from './renderers/RechartsStackChart'
import { VisxStackChart } from './renderers/VisxStackChart'
import type { ChartDensity, ChartType, StackChartSpec } from './types'

type ChartColumns = 1 | 2 | 3

const comparisonRows: Array<[string, string, string, string, string]> = [
  ['diverging stack correctness', 'acceptable', 'good', 'good', 'good'],
  ['sign-changing series handling', 'acceptable', 'good', 'good', 'good'],
  ['irregular x spacing', 'good', 'good', 'good', 'good'],
  ['dense layout control', 'acceptable', 'good', 'good', 'good'],
  ['custom docked inspector', 'good', 'good', 'good', 'good'],
  ['compact legend/drawer', 'good', 'good', 'good', 'good'],
  ['keyboard inspection', 'good', 'good', 'good', 'good'],
  ['React state integration', 'good', 'awkward', 'good', 'good'],
  ['implementation complexity', 'low', 'medium', 'high', 'medium'],
  ['perceived maintainability', 'acceptable', 'acceptable', 'good', 'good'],
  ['performance with 20 series', 'good', 'good', 'good', 'good'],
  ['visual polish', 'acceptable', 'good', 'acceptable', 'good'],
  ['native interactivity (zoom/pan/export)', 'acceptable', 'acceptable', 'acceptable', 'good'],
  ['export/screenshot suitability', 'good', 'good', 'good', 'good'],
]

function chartNotes(spec: StackChartSpec) {
  return `${spec.options.interpolation} ${spec.options.density}; sign-changing stressors are stacked nearest zero on either side and retain one colour.`
}

export function App() {
  const [density, setDensity] = useState<ChartDensity>('dense')
  const [interpolation, setInterpolation] = useState<StackChartSpec['options']['interpolation']>('linear')
  const [useFullSeries, setUseFullSeries] = useState(true)
  const [chartType, setChartType] = useState<ChartType>('area')
  const [chartColumns, setChartColumns] = useState<ChartColumns>(3)
  const [resetKey, setResetKey] = useState(0)
  const spec = useMemo(() => specWithOptions(density, interpolation, useFullSeries), [density, interpolation, useFullSeries])

  return (
    <main className="chart-lab">
      <section className="hero">
        <div>
          <h1>Chart bake-off</h1>
          <p>Dense React chart prototypes for analyst-grade energy and emissions modelling outputs. Highcharts intentionally excluded.</p>
        </div>
        <div className="controls" aria-label="Chart controls">
          <label>Density <select value={density} onChange={(event) => setDensity(event.target.value as ChartDensity)}><option>comfortable</option><option>compact</option><option>dense</option></select></label>
          <label>Interpolation <select value={interpolation} onChange={(event) => setInterpolation(event.target.value as StackChartSpec['options']['interpolation'])}><option>linear</option><option>step</option></select></label>
          <label>Series <select value={useFullSeries ? 'full' : 'grouped'} onChange={(event) => setUseFullSeries(event.target.value === 'full')}><option value="full">full</option><option value="grouped">reduced</option></select></label>
          <label>Chart type <select value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)}><option>area</option><option>bar</option></select></label>
          <label>Columns <select value={chartColumns} onChange={(event) => setChartColumns(Number(event.target.value) as ChartColumns)}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label>
          <button type="button" onClick={() => setResetKey((key) => key + 1)}>reset inspection</button>
        </div>
      </section>
      <section className="challenge-panel" aria-labelledby="challenge-panel-heading">
        <h2 id="challenge-panel-heading">Main plotting challenges under test</h2>
        <ul>
          <li>Fixed plot geometry: legends, inspectors, and controls must not resize or crowd the plotting area.</li>
          <li>Dense analyst workflow: compact labels, small fonts, low whitespace, no intrusive floating tooltip.</li>
          <li>Diverging stack correctness: positive emissions stack upward, removals/offsets stack downward.</li>
          <li>Sign-changing series: one logical trace can move across zero, stay one colour, and stack nearest zero on either side.</li>
          <li>Irregular model years: pointer inspection and area geometry respect numeric spacing through 2070.</li>
          <li>Coordinated inspection: year cursor, collapsed Inspector strip, expandable readout, legend focus, trace isolation, and keyboard navigation work as one system.</li>
          <li>Chart-specific controls: regular/cumulative modes, net line, and NDC target overlays use a consistent tool area.</li>
          <li>Operational outputs: compact web view plus high-resolution compact/full PNG export for each rendered chart card.</li>
        </ul>
      </section>
      <p className="fixture-note">Fixture: {spec.series.length} Australia emissions sector/subsector series, irregular years [{spec.data.map((row) => row.year).join(', ')}], emissions, removals, offsets, sign changes, long labels, and non-linear transitions. Bars are included but less suitable for irregular time spacing because equal widths can read as categorical.</p>
      <div className="cards" key={resetKey} style={{ '--chart-columns': chartColumns } as React.CSSProperties}>
        <ChartCard name="Recharts" spec={spec} chartType={chartType} Renderer={RechartsStackChart} note={`Uses Recharts axes/areas with stackOffset="sign"; explicit shared stack geometry drives domains/inspection, but Recharts owns rendered stack internals. ${chartNotes(spec)}`} />
        <ChartCard name="Observable Plot" spec={spec} chartType={chartType} Renderer={ObservablePlotStackChart} note={`Uses React effect embedding and explicit y0/y1 StackCell geometry. Clean grammar, less native React lifecycle. ${chartNotes(spec)}`} />
        <ChartCard name="visx + D3" spec={spec} chartType={chartType} Renderer={VisxStackChart} note={`Reference-control implementation: explicit y0/y1 paths, transparent hit target, split positive/negative sign-changing segments. ${chartNotes(spec)}`} />
        <ChartCard name="Plotly" spec={spec} chartType={chartType} Renderer={PlotlyStackChart} note={`Plotly.react draws explicit y0/y1 fill:"toself" bands with native grid, axes, and an x spikeline cursor; events feed the shared inspector, uirevision preserves zoom, and the modebar adds native zoom/pan/reset and a 3x PNG export. ${chartNotes(spec)}`} />
      </div>
      <section className="comparison-panel">
        <h2>Comparison checklist</h2>
        <table>
          <thead><tr><th>Criterion</th><th>Recharts</th><th>Observable Plot</th><th>visx + D3</th><th>Plotly</th></tr></thead>
          <tbody>{comparisonRows.map(([criterion, recharts, plot, visx, plotly]) => <tr key={criterion}><th>{criterion}</th><td>{recharts}</td><td>{plot}</td><td>{visx}</td><td>{plotly}</td></tr>)}</tbody>
        </table>
      </section>
    </main>
  )
}
