export type ChartDensity = 'comfortable' | 'compact' | 'dense'
export type ChartType = 'area' | 'bar'
export type ChartKind = 'stack' | 'counterfactual' | 'line' | 'role-result'
export type ChartViewMode = 'regular' | 'cumulative'
export type RoleResultMode = 'output' | 'cap'

export type StackChartSpec = {
  title: string
  subtitle?: string
  unit: string
  x: {
    key: string
    label: string
    type: 'number' | 'date'
  }
  series: StackSeriesMeta[]
  data: StackDatum[]
  options: {
    density: ChartDensity
    stack: 'diverging'
    interpolation: 'linear' | 'step'
    legendMode: 'compact'
    inspectionMode: 'slice'
    maxInlineLegendItems: number
    maxInspectorRows: number
  }
}

export type StackSeriesMeta = {
  key: string
  label: string
  shortLabel: string
  group?: string
  colorKey?: string
}

export type StackDatum = {
  year: number
  [seriesKey: string]: number | null
}

export type StackCell = {
  year: number
  key: string
  label: string
  shortLabel: string
  group?: string
  value: number
  y0: number
  y1: number
  sign: 'positive' | 'negative' | 'zero'
  isMissing: boolean
}

export type StackSlice = {
  year: number
  cells: StackCell[]
  positiveTotal: number
  negativeTotal: number
  netTotal: number
  grossTotal: number
}

export type InspectionState = {
  activeYear: number | null
  pinnedYear: number | null
  activeSeriesKey: string | null
}

export type RendererProps = {
  spec: StackChartSpec
  chartKind: ChartKind
  chartType: ChartType
  viewMode: ChartViewMode
  showNetLine: boolean
  showTargets: boolean
  width: number
  height: number
  inspection: InspectionState
  setInspection: React.Dispatch<React.SetStateAction<InspectionState>>
}
