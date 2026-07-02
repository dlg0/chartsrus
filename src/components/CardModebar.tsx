// Floating, modebar-styled icon toolbar shown over the plot of renderers that have no native modebar
// (Recharts, Observable Plot, visx). It mirrors the look of Plotly's modebar and carries the card-level
// controls - full screen, tools (the mode/net/NDC/export popover), the hover tooltip toggle and the
// legend position cycle (top strip, bottom strip, hidden).
export type CardLegendPosition = 'top' | 'right' | 'bottom' | 'off'

type Props = {
  isFullscreen: boolean
  toolsOpen: boolean
  tooltipOn: boolean
  legendPosition: CardLegendPosition
  onToggleTools: () => void
  onToggleFullscreen: () => void
  onToggleTooltip: () => void
  onCycleLegend: () => void
  onSaveImage: () => void
  onSaveFull: () => void
}

// 24x24 filled glyphs (Material-style, y-down like SVG), matching the Plotly custom modebar icons.
const TOOLS_ICON = 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z'
const FULLSCREEN_ICON = 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'
const TOOLTIP_ICON = 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z'
const LEGEND_ICON = 'M3 6h4v2H3V6zm6 0h12v2H9V6zM3 11h4v2H3v-2zm6 0h12v2H9v-2zM3 16h4v2H3v-2zm6 0h12v2H9v-2z'
const CAMERA_ICON = 'M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zM9 2l-1.83 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z'
const CAMERA_FULL_ICON = 'M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z'

export function CardModebar({ isFullscreen, toolsOpen, tooltipOn, legendPosition, onToggleTools, onToggleFullscreen, onToggleTooltip, onCycleLegend, onSaveImage, onSaveFull }: Props) {
  return (
    <div className="card-modebar" data-export-ignore="true">
      <button type="button" className="card-modebar-btn" title={isFullscreen ? 'Exit full screen' : 'Full screen'} aria-label="Full screen" aria-pressed={isFullscreen} onClick={onToggleFullscreen}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={FULLSCREEN_ICON} fill="currentColor" /></svg>
      </button>
      <button type="button" className="card-modebar-btn" title="Tools" aria-label="Tools" aria-expanded={toolsOpen} onClick={onToggleTools}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={TOOLS_ICON} fill="currentColor" /></svg>
      </button>
      <button type="button" className={tooltipOn ? 'card-modebar-btn active' : 'card-modebar-btn'} title="Toggle the hover tooltip" aria-label="Toggle tooltip" aria-pressed={tooltipOn} onClick={onToggleTooltip}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={TOOLTIP_ICON} fill="currentColor" /></svg>
      </button>
      <button type="button" className={legendPosition !== 'top' ? 'card-modebar-btn active' : 'card-modebar-btn'} title={`Legend: ${legendPosition === 'off' ? 'hidden' : legendPosition} (click cycles top, right, bottom, hidden)`} aria-label="Cycle legend position" onClick={onCycleLegend}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={LEGEND_ICON} fill="currentColor" /></svg>
      </button>
      <button type="button" className="card-modebar-btn" title="Save image (compact view)" aria-label="Save image" onClick={onSaveImage}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={CAMERA_ICON} fill="currentColor" /></svg>
      </button>
      <button type="button" className="card-modebar-btn" title="Save full image (every legend item and inspector row)" aria-label="Save full image" onClick={onSaveFull}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={CAMERA_FULL_ICON} fill="currentColor" /></svg>
      </button>
    </div>
  )
}
