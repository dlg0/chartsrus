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
  title: 'Australia emissions balance',
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
