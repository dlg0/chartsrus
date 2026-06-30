import type { StackChartSpec, StackSeriesMeta } from './types'

export const years = [2025, 2026, 2027, 2030, 2035, 2040, 2050, 2060, 2070]

export const fixtureSeries: StackSeriesMeta[] = [
  { key: 'elecCoal', label: 'Electricity — coal-fired generation emissions from ageing grid-connected power stations', shortLabel: 'Coal power', group: 'Electricity' },
  { key: 'elecGas', label: 'Electricity — gas generation and peaking emissions during renewable firming periods', shortLabel: 'Gas power', group: 'Electricity' },
  { key: 'elecFirmingRemote', label: 'Electricity — remote diesel, reliability firming, and isolated-grid backup generation', shortLabel: 'Firming/remote', group: 'Electricity' },
  { key: 'indHeatFossil', label: 'Stationary energy — industrial fossil process heat for alumina, minerals, food, and chemicals', shortLabel: 'Industrial heat', group: 'Stationary energy' },
  { key: 'miningEnergy', label: 'Stationary energy — mining diesel, onsite gas, and remote operations energy emissions', shortLabel: 'Mining energy', group: 'Stationary energy' },
  { key: 'buildingGas', label: 'Stationary energy — building gas and LPG use for residential and commercial heating', shortLabel: 'Building gas', group: 'Stationary energy' },
  { key: 'passengerIce', label: 'Transport — passenger road internal-combustion vehicle tailpipe emissions', shortLabel: 'Cars ICE', group: 'Transport' },
  { key: 'freightDiesel', label: 'Transport — road freight diesel emissions from heavy rigid and articulated trucks', shortLabel: 'Freight diesel', group: 'Transport' },
  { key: 'aviation', label: 'Transport — domestic aviation liquid fuel emissions with partial sustainable aviation fuel uptake', shortLabel: 'Aviation', group: 'Transport' },
  { key: 'marineRailOffroad', label: 'Transport — marine, rail, and off-road mobile combustion emissions', shortLabel: 'Marine/rail/off', group: 'Transport' },
  { key: 'coalMethane', label: 'Fugitive emissions — coal mining methane from underground and open-cut operations', shortLabel: 'Coal methane', group: 'Fugitive emissions' },
  { key: 'gasLngFugitive', label: 'Fugitive emissions — oil, gas, and LNG methane and carbon dioxide releases', shortLabel: 'Gas/LNG fugitive', group: 'Fugitive emissions' },
  { key: 'cementLime', label: 'Industrial processes — cement clinker and lime calcination process emissions', shortLabel: 'Cement/lime', group: 'Industrial processes' },
  { key: 'steelMetals', label: 'Industrial processes — steel, metals, and mineral product process emissions', shortLabel: 'Steel/metals', group: 'Industrial processes' },
  { key: 'chemRefrigAl', label: 'Industrial processes — chemicals, refrigerants, and aluminium smelting emissions', shortLabel: 'Chem/refrig/Al', group: 'Industrial processes' },
  { key: 'entericMethane', label: 'Agriculture — enteric methane from beef cattle, dairy cattle, and sheep', shortLabel: 'Enteric CH₄', group: 'Agriculture' },
  { key: 'soilsN2o', label: 'Agriculture — soils, fertiliser, cropping, and savanna nitrous oxide emissions', shortLabel: 'Soils N₂O', group: 'Agriculture' },
  { key: 'manureFarmEnergy', label: 'Agriculture — manure management, piggeries, dairies, and farm energy emissions', shortLabel: 'Manure/farm', group: 'Agriculture' },
  { key: 'landfillMethane', label: 'Waste — landfill methane emissions after gas capture and organic waste diversion', shortLabel: 'Landfill CH₄', group: 'Waste' },
  { key: 'wastewater', label: 'Waste — wastewater, composting, and residual waste treatment emissions', shortLabel: 'Wastewater', group: 'Waste' },
  { key: 'nativeRegrowth', label: 'Land — native regrowth and avoided clearing removals across mixed rainfall zones', shortLabel: 'Native regrowth', group: 'Land and removals' },
  { key: 'plantationSoil', label: 'Land — plantation forestry, environmental plantings, and soil carbon removals', shortLabel: 'Plantation/soil', group: 'Land and removals' },
  { key: 'disturbanceReversal', label: 'Land — disturbance and reversal buffer stress-test series that changes from sink to source', shortLabel: 'Reversal buffer', group: 'Land and removals' },
  { key: 'engineeredCdr', label: 'Removals — bioenergy with carbon capture and direct air capture storage', shortLabel: 'Engineered CDR', group: 'Removals' },
  { key: 'ccsStorage', label: 'Removals — point-source carbon capture and credited geological storage', shortLabel: 'CCS storage', group: 'Removals' },
  { key: 'bioenergyEfuels', label: 'Fuels — bioenergy and e-fuels lifecycle balance shifting from emissions to removals', shortLabel: 'Bio/e-fuels', group: 'Fuels and removals' },
]

export const baseSpec: StackChartSpec = {
  title: 'Emissions balance',
  subtitle: 'Prototype-only fixture: sector/subsector emissions, removals, offsets, sign-changing stressors, and irregular model years to 2070.',
  unit: 'Mt CO₂-e',
  x: { key: 'year', label: 'Model year', type: 'number' },
  series: fixtureSeries,
  data: [
    { year: 2025, elecCoal: 118, elecGas: 20, elecFirmingRemote: 4, indHeatFossil: 33, miningEnergy: 12, buildingGas: 16, passengerIce: 42, freightDiesel: 27, aviation: 10, marineRailOffroad: 9, coalMethane: 23, gasLngFugitive: 18, cementLime: 7, steelMetals: 8, chemRefrigAl: 13, entericMethane: 52, soilsN2o: 18, manureFarmEnergy: 6, landfillMethane: 10, wastewater: 3, nativeRegrowth: -28, plantationSoil: -10, disturbanceReversal: -3, engineeredCdr: 0, ccsStorage: 0, bioenergyEfuels: 2 },
    { year: 2026, elecCoal: 111, elecGas: 22, elecFirmingRemote: 5, indHeatFossil: 34, miningEnergy: 13, buildingGas: 16, passengerIce: 43, freightDiesel: 29, aviation: 11, marineRailOffroad: 10, coalMethane: 24, gasLngFugitive: 20, cementLime: 7, steelMetals: 8, chemRefrigAl: 14, entericMethane: 53, soilsN2o: 19, manureFarmEnergy: 6, landfillMethane: 10, wastewater: 3, nativeRegrowth: -28, plantationSoil: -11, disturbanceReversal: -5, engineeredCdr: 0, ccsStorage: -0.5, bioenergyEfuels: 2 },
    { year: 2027, elecCoal: 103, elecGas: 23, elecFirmingRemote: 6, indHeatFossil: 34, miningEnergy: 14, buildingGas: 15, passengerIce: 42, freightDiesel: 31, aviation: 12, marineRailOffroad: 11, coalMethane: 23, gasLngFugitive: 22, cementLime: 8, steelMetals: 9, chemRefrigAl: 15, entericMethane: 54, soilsN2o: 20, manureFarmEnergy: 7, landfillMethane: 9, wastewater: 3, nativeRegrowth: -30, plantationSoil: -13, disturbanceReversal: -4, engineeredCdr: 0, ccsStorage: -1, bioenergyEfuels: 3 },
    { year: 2030, elecCoal: 76, elecGas: 20, elecFirmingRemote: 6, indHeatFossil: 32, miningEnergy: 16, buildingGas: 13, passengerIce: 36, freightDiesel: 35, aviation: 15, marineRailOffroad: 13, coalMethane: 20, gasLngFugitive: 25, cementLime: 9, steelMetals: 10, chemRefrigAl: 17, entericMethane: 55, soilsN2o: 23, manureFarmEnergy: 8, landfillMethane: 8, wastewater: 3, nativeRegrowth: -36, plantationSoil: -20, disturbanceReversal: -1, engineeredCdr: -1, ccsStorage: -4, bioenergyEfuels: 4 },
    { year: 2035, elecCoal: 34, elecGas: 15, elecFirmingRemote: 5, indHeatFossil: 26, miningEnergy: 15, buildingGas: 8, passengerIce: 23, freightDiesel: 33, aviation: 18, marineRailOffroad: 12, coalMethane: 14, gasLngFugitive: 23, cementLime: 9, steelMetals: 8, chemRefrigAl: 18, entericMethane: 51, soilsN2o: 25, manureFarmEnergy: 7, landfillMethane: 6, wastewater: 3.5, nativeRegrowth: -50, plantationSoil: -32, disturbanceReversal: 4, engineeredCdr: -8, ccsStorage: -12, bioenergyEfuels: 1 },
    { year: 2040, elecCoal: 12, elecGas: 10, elecFirmingRemote: 3, indHeatFossil: 20, miningEnergy: 11, buildingGas: 4, passengerIce: 12, freightDiesel: 27, aviation: 19, marineRailOffroad: 10, coalMethane: 8, gasLngFugitive: 17, cementLime: 7, steelMetals: 5, chemRefrigAl: 15, entericMethane: 44, soilsN2o: 24, manureFarmEnergy: 6, landfillMethane: 4, wastewater: 3, nativeRegrowth: -58, plantationSoil: -40, disturbanceReversal: 8, engineeredCdr: -22, ccsStorage: -18, bioenergyEfuels: -5 },
    { year: 2050, elecCoal: 2, elecGas: 5, elecFirmingRemote: 1.5, indHeatFossil: 11, miningEnergy: 5, buildingGas: 1.5, passengerIce: 3, freightDiesel: 15, aviation: 16, marineRailOffroad: 6, coalMethane: 3, gasLngFugitive: 8, cementLime: 3.5, steelMetals: 2, chemRefrigAl: 9, entericMethane: 35, soilsN2o: 21, manureFarmEnergy: 4, landfillMethane: 2.5, wastewater: 2, nativeRegrowth: -65, plantationSoil: -45, disturbanceReversal: 11, engineeredCdr: -45, ccsStorage: -25, bioenergyEfuels: -15 },
    { year: 2060, elecCoal: 0, elecGas: 2, elecFirmingRemote: 0.8, indHeatFossil: 5, miningEnergy: 2, buildingGas: 0.8, passengerIce: 1, freightDiesel: 7, aviation: 11, marineRailOffroad: 3, coalMethane: 1.5, gasLngFugitive: 3, cementLime: 1.5, steelMetals: 0.8, chemRefrigAl: 4, entericMethane: 26, soilsN2o: 17, manureFarmEnergy: 2.5, landfillMethane: 1.5, wastewater: 1.5, nativeRegrowth: -60, plantationSoil: -38, disturbanceReversal: 5, engineeredCdr: -60, ccsStorage: -22, bioenergyEfuels: -20 },
    { year: 2070, elecCoal: 0, elecGas: 1, elecFirmingRemote: 0.4, indHeatFossil: 2, miningEnergy: 1, buildingGas: 0.3, passengerIce: 0.5, freightDiesel: 3, aviation: 7, marineRailOffroad: 2, coalMethane: 0.7, gasLngFugitive: 1, cementLime: 0.8, steelMetals: 0.4, chemRefrigAl: 2, entericMethane: 20, soilsN2o: 15, manureFarmEnergy: 1.5, landfillMethane: 0.8, wastewater: 1, nativeRegrowth: -52, plantationSoil: -28, disturbanceReversal: 2, engineeredCdr: -70, ccsStorage: -16, bioenergyEfuels: -18 },
  ],
  options: {
    density: 'dense',
    stack: 'diverging',
    interpolation: 'linear',
    legendMode: 'compact',
    inspectionMode: 'slice',
    maxInlineLegendItems: 7,
    maxInspectorRows: 10,
  },
}

export function specWithOptions(
  density: StackChartSpec['options']['density'],
  interpolation: StackChartSpec['options']['interpolation'],
  useFullSeries: boolean,
): StackChartSpec {
  const sectorLevelKeys = ['elecCoal', 'indHeatFossil', 'passengerIce', 'coalMethane', 'cementLime', 'entericMethane', 'landfillMethane', 'nativeRegrowth', 'engineeredCdr', 'bioenergyEfuels']
  const series = useFullSeries ? fixtureSeries : fixtureSeries.filter((item) => sectorLevelKeys.includes(item.key))
  return {
    ...baseSpec,
    series,
    options: {
      ...baseSpec.options,
      density,
      interpolation,
      maxInlineLegendItems: density === 'dense' ? 6 : 8,
      maxInspectorRows: density === 'dense' ? 9 : 12,
    },
  }
}

const counterfactualSeries: StackSeriesMeta[] = [
  { key: 'activityGrowth', label: 'Activity growth and service-demand rebound', shortLabel: 'Activity', group: 'Drivers' },
  { key: 'fuelSwitching', label: 'Fuel switching and electrification', shortLabel: 'Fuel switch', group: 'Mitigation' },
  { key: 'efficiency', label: 'Operational and embodied efficiency', shortLabel: 'Efficiency', group: 'Mitigation' },
  { key: 'cleanSupply', label: 'Clean supply and residual electricity decarbonisation', shortLabel: 'Clean supply', group: 'Mitigation' },
  { key: 'upstream', label: 'Upstream and cross-sector interactions', shortLabel: 'Upstream', group: 'Interactions' },
  { key: 'residual', label: 'Closure residual and solver reallocation', shortLabel: 'Residual', group: 'Diagnostics' },
]

export const counterfactualSpec: StackChartSpec = {
  title: 'Base vs Focus decomposition',
  subtitle: 'Base and Focus totals with positive and negative contributors stacked from the Base counterfactual line.',
  unit: 'Mt CO₂-e',
  x: baseSpec.x,
  series: counterfactualSeries,
  data: [
    { year: 2025, counterfactual: 410, factual: 407, activityGrowth: 6, fuelSwitching: -2, efficiency: -4, cleanSupply: -2, upstream: 1, residual: -2 },
    { year: 2026, counterfactual: 402, factual: 394, activityGrowth: 8, fuelSwitching: -4, efficiency: -7, cleanSupply: -5, upstream: 2, residual: -2 },
    { year: 2027, counterfactual: 392, factual: 378, activityGrowth: 10, fuelSwitching: -8, efficiency: -10, cleanSupply: -8, upstream: 3, residual: -1 },
    { year: 2030, counterfactual: 360, factual: 318, activityGrowth: 18, fuelSwitching: -26, efficiency: -23, cleanSupply: -16, upstream: 7, residual: -2 },
    { year: 2035, counterfactual: 305, factual: 214, activityGrowth: 28, fuelSwitching: -54, efficiency: -42, cleanSupply: -30, upstream: 11, residual: -4 },
    { year: 2040, counterfactual: 252, factual: 118, activityGrowth: 35, fuelSwitching: -74, efficiency: -55, cleanSupply: -48, upstream: 15, residual: -7 },
    { year: 2050, counterfactual: 170, factual: -12, activityGrowth: 43, fuelSwitching: -98, efficiency: -72, cleanSupply: -72, upstream: 23, residual: -6 },
    { year: 2060, counterfactual: 128, factual: -54, activityGrowth: 36, fuelSwitching: -88, efficiency: -65, cleanSupply: -82, upstream: 25, residual: -8 },
    { year: 2070, counterfactual: 106, factual: -78, activityGrowth: 30, fuelSwitching: -78, efficiency: -58, cleanSupply: -88, upstream: 18, residual: -8 },
  ],
  options: baseSpec.options,
}

const lineSeries: StackSeriesMeta[] = [
  { key: 'finalEnergy', label: 'Final energy demand', shortLabel: 'Final energy', group: 'Demand' },
  { key: 'electricity', label: 'Electricity supply', shortLabel: 'Electricity', group: 'Supply' },
  { key: 'hydrogen', label: 'Hydrogen and e-fuel production', shortLabel: 'H₂/e-fuels', group: 'Supply' },
  { key: 'residualEmissions', label: 'Residual emissions index', shortLabel: 'Residual CO₂e', group: 'Emissions' },
  { key: 'abatement', label: 'Cumulative abatement delivery index', shortLabel: 'Abatement', group: 'Delivery' },
]

export const lineSpec: StackChartSpec = {
  title: 'Scenario indicators',
  subtitle: 'Representative output/cap/time-series chart with several model indicators indexed to 2025 = 100.',
  unit: 'index',
  x: baseSpec.x,
  series: lineSeries,
  data: [
    { year: 2025, finalEnergy: 100, electricity: 100, hydrogen: 1, residualEmissions: 100, abatement: 0 },
    { year: 2026, finalEnergy: 102, electricity: 106, hydrogen: 2, residualEmissions: 96, abatement: 5 },
    { year: 2027, finalEnergy: 104, electricity: 112, hydrogen: 4, residualEmissions: 91, abatement: 11 },
    { year: 2030, finalEnergy: 108, electricity: 132, hydrogen: 12, residualEmissions: 76, abatement: 30 },
    { year: 2035, finalEnergy: 112, electricity: 168, hydrogen: 36, residualEmissions: 52, abatement: 58 },
    { year: 2040, finalEnergy: 110, electricity: 205, hydrogen: 62, residualEmissions: 31, abatement: 78 },
    { year: 2050, finalEnergy: 102, electricity: 266, hydrogen: 106, residualEmissions: 4, abatement: 100 },
    { year: 2060, finalEnergy: 98, electricity: 312, hydrogen: 135, residualEmissions: -12, abatement: 112 },
    { year: 2070, finalEnergy: 95, electricity: 348, hydrogen: 148, residualEmissions: -20, abatement: 118 },
  ],
  options: baseSpec.options,
}

const roleResultSeries: StackSeriesMeta[] = [
  { key: 'transshipment', label: 'Trans-shipment handling pathway output', shortLabel: 'Trans-shipment', group: 'Pathway' },
  { key: 'electricDrive', label: 'Electric-drive compression pathway output', shortLabel: 'Electric-drive', group: 'Pathway' },
  { key: 'lngTrainFlue', label: 'LNG-train flue-gas capture pathway output', shortLabel: 'LNG-train flue', group: 'Pathway' },
]

export const roleResultOutputSpec: StackChartSpec = {
  title: 'Role results · Export LNG output',
  subtitle: 'Explorer-style pathway output card: stacked method output by model year with a cap/reference line available in the same card tools.',
  unit: 'Mt LNG',
  x: baseSpec.x,
  series: roleResultSeries,
  data: [
    { year: 2025, transshipment: 78, electricDrive: 8, lngTrainFlue: 0 },
    { year: 2026, transshipment: 80, electricDrive: 10, lngTrainFlue: 0 },
    { year: 2027, transshipment: 81, electricDrive: 12, lngTrainFlue: 0 },
    { year: 2030, transshipment: 84, electricDrive: 18, lngTrainFlue: 0 },
    { year: 2035, transshipment: 76, electricDrive: 34, lngTrainFlue: 8 },
    { year: 2040, transshipment: 63, electricDrive: 47, lngTrainFlue: 22 },
    { year: 2050, transshipment: 26, electricDrive: 60, lngTrainFlue: 40 },
    { year: 2060, transshipment: 15, electricDrive: 54, lngTrainFlue: 48 },
    { year: 2070, transshipment: 9, electricDrive: 48, lngTrainFlue: 52 },
  ],
  options: baseSpec.options,
}

const roleCapSeries: StackSeriesMeta[] = [
  { key: 'transshipmentShare', label: 'Trans-shipment share', shortLabel: 'Trans-ship share', colorKey: 'transshipment' },
  { key: 'transshipmentCap', label: 'Trans-shipment cap', shortLabel: 'Trans-ship cap', colorKey: 'transshipment' },
  { key: 'electricDriveShare', label: 'Electric-drive share', shortLabel: 'Elec-drive share', colorKey: 'electricDrive' },
  { key: 'electricDriveCap', label: 'Electric-drive cap', shortLabel: 'Elec-drive cap', colorKey: 'electricDrive' },
  { key: 'lngTrainFlueShare', label: 'LNG-train flue share', shortLabel: 'LNG flue share', colorKey: 'lngTrainFlue' },
  { key: 'lngTrainFlueCap', label: 'LNG-train flue cap', shortLabel: 'LNG flue cap', colorKey: 'lngTrainFlue' },
]

export const roleResultCapSpec: StackChartSpec = {
  title: 'Role results · Export LNG caps',
  subtitle: 'Explorer-style cap mode: each pathway share is compared with its configured max-share cap.',
  unit: '% of output',
  x: baseSpec.x,
  series: roleCapSeries,
  data: [
    { year: 2025, transshipmentShare: 91, transshipmentCap: 100, electricDriveShare: 9, electricDriveCap: 0, lngTrainFlueShare: 0, lngTrainFlueCap: 0 },
    { year: 2026, transshipmentShare: 89, transshipmentCap: 100, electricDriveShare: 11, electricDriveCap: 4, lngTrainFlueShare: 0, lngTrainFlueCap: 0 },
    { year: 2027, transshipmentShare: 87, transshipmentCap: 100, electricDriveShare: 13, electricDriveCap: 8, lngTrainFlueShare: 0, lngTrainFlueCap: 0 },
    { year: 2030, transshipmentShare: 82, transshipmentCap: 100, electricDriveShare: 18, electricDriveCap: 18, lngTrainFlueShare: 0, lngTrainFlueCap: 0 },
    { year: 2035, transshipmentShare: 64, transshipmentCap: 90, electricDriveShare: 29, electricDriveCap: 34, lngTrainFlueShare: 7, lngTrainFlueCap: 7 },
    { year: 2040, transshipmentShare: 48, transshipmentCap: 75, electricDriveShare: 36, electricDriveCap: 47, lngTrainFlueShare: 17, lngTrainFlueCap: 17 },
    { year: 2050, transshipmentShare: 21, transshipmentCap: 40, electricDriveShare: 48, electricDriveCap: 60, lngTrainFlueShare: 32, lngTrainFlueCap: 32 },
    { year: 2060, transshipmentShare: 13, transshipmentCap: 25, electricDriveShare: 46, electricDriveCap: 54, lngTrainFlueShare: 41, lngTrainFlueCap: 41 },
    { year: 2070, transshipmentShare: 8, transshipmentCap: 15, electricDriveShare: 44, electricDriveCap: 48, lngTrainFlueShare: 48, lngTrainFlueCap: 48 },
  ],
  options: baseSpec.options,
}

export function specWithDensity(spec: StackChartSpec, density: StackChartSpec['options']['density']): StackChartSpec {
  return {
    ...spec,
    options: {
      ...spec.options,
      density,
      maxInlineLegendItems: density === 'dense' ? 6 : 8,
      maxInspectorRows: density === 'dense' ? 9 : 12,
    },
  }
}
