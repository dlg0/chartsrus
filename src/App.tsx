import { useMemo, useState } from 'react'
import { ChartCard } from './components/ChartCard'
import { counterfactualSpec, lineSpec, roleResultCapSpec, roleResultOutputSpec, specWithDensity, specWithOptions } from './fixture'
import { VisxStackChart } from './renderers/VisxStackChart'
import type { ChartDensity, ChartKind, ChartType, RoleResultMode, StackChartSpec } from './types'

export function App() {
  const [density, setDensity] = useState<ChartDensity>('dense')
  const [interpolation, setInterpolation] = useState<StackChartSpec['options']['interpolation']>('linear')
  const [useFullSeries, setUseFullSeries] = useState(true)
  const [chartType, setChartType] = useState<ChartType>('area')
  const [resetKey, setResetKey] = useState(0)
  const spec = useMemo(() => specWithOptions(density, interpolation, useFullSeries), [density, interpolation, useFullSeries])
  const decompositionSpec = useMemo(() => specWithDensity(counterfactualSpec, density), [density])
  const trajectorySpec = useMemo(() => specWithDensity(lineSpec, density), [density])
  const roleOutputSpec = useMemo(() => specWithDensity(roleResultOutputSpec, density), [density])
  const roleCapSpec = useMemo(() => specWithDensity(roleResultCapSpec, density), [density])
  const roleModeSpecs = useMemo<Partial<Record<RoleResultMode, StackChartSpec>>>(() => ({ output: roleOutputSpec, cap: roleCapSpec }), [roleCapSpec, roleOutputSpec])

  function renderRow(title: string, description: string, chartKind: ChartKind, rowSpec: StackChartSpec, rowChartType: ChartType, modeSpecs?: Partial<Record<RoleResultMode, StackChartSpec>>) {
    return (
      <section className="chart-row" aria-labelledby={`${chartKind}-row-heading`}>
        <div className="chart-row-heading">
          <h2 id={`${chartKind}-row-heading`}>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="cards">
          <ChartCard name="visx" spec={rowSpec} chartKind={chartKind} chartType={rowChartType} modeSpecs={modeSpecs} Renderer={VisxStackChart} />
        </div>
      </section>
    )
  }

  return (
    <main className="chart-lab">
      <section className="hero">
        <div>
          <h1>Production chart renderer</h1>
          <p>Dense React charts for analyst-grade energy and emissions modelling outputs, built on the visx renderer selected by the bake-off.</p>
        </div>
        <div className="controls" aria-label="Chart controls">
          <label>Density <select value={density} onChange={(event) => setDensity(event.target.value as ChartDensity)}><option>comfortable</option><option>compact</option><option>dense</option></select></label>
          <label>Interpolation <select value={interpolation} onChange={(event) => setInterpolation(event.target.value as StackChartSpec['options']['interpolation'])}><option>linear</option><option>step</option></select></label>
          <label>Series <select value={useFullSeries ? 'full' : 'grouped'} onChange={(event) => setUseFullSeries(event.target.value === 'full')}><option value="full">full</option><option value="grouped">reduced</option></select></label>
          <label>Chart type <select value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)}><option>area</option><option>bar</option><option>line</option></select></label>
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
      <p className="fixture-note">Fixtures: stack row uses {spec.series.length} Australia emissions sector/subsector series; decomposition row uses Base/Focus contributors; line row uses indexed scenario indicators. All keep irregular years [{spec.data.map((row) => row.year).join(', ')}]. Bars are included but less suitable for irregular time spacing because equal widths can read as categorical.</p>
      <div key={resetKey}>
        {renderRow('Stacked area/bar with overlays', 'Current webapp-style diverging emissions stack with net and NDC overlay controls.', 'stack', spec, chartType)}
        {renderRow('Role result output/cap cards', 'Explorer Role results pattern: pathway output and pathway cap/share trajectories use a card-local mode selector in tools.', 'role-result', roleOutputSpec, chartType, roleModeSpecs)}
        {renderRow('Counterfactual decomposition', 'Base-vs-Focus wedge: contributor geometry follows the same global area/bar chart-type toggle.', 'counterfactual', decompositionSpec, chartType)}
        {renderRow('Line chart trajectories', 'Standard multi-series model output chart for demand, supply, residual emissions, and delivery indices.', 'line', trajectorySpec, 'area')}
      </div>
    </main>
  )
}
