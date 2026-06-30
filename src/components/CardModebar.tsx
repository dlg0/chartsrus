// Floating, modebar-styled icon toolbar shown over the plot of renderers that have no native modebar
// (Recharts, Observable Plot, visx). It mirrors the look of Plotly's modebar and carries the card-level
// controls - tools (the mode/net/NDC/export popover) and full screen.
type Props = {
  isFullscreen: boolean
  toolsOpen: boolean
  onToggleTools: () => void
  onToggleFullscreen: () => void
}

// 24x24 filled glyphs (Material-style, y-down like SVG), matching the Plotly custom modebar icons.
const TOOLS_ICON = 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z'
const FULLSCREEN_ICON = 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'

export function CardModebar({ isFullscreen, toolsOpen, onToggleTools, onToggleFullscreen }: Props) {
  return (
    <div className="card-modebar" data-export-ignore="true">
      <button type="button" className="card-modebar-btn" title="Tools" aria-label="Tools" aria-expanded={toolsOpen} onClick={onToggleTools}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={TOOLS_ICON} fill="currentColor" /></svg>
      </button>
      <button type="button" className="card-modebar-btn" title={isFullscreen ? 'Exit full screen' : 'Full screen'} aria-label="Full screen" aria-pressed={isFullscreen} onClick={onToggleFullscreen}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={FULLSCREEN_ICON} fill="currentColor" /></svg>
      </button>
    </div>
  )
}
