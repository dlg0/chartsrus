// The prebuilt partial bundle ships no types of its own; alias it to the full @types/plotly.js
// surface so the renderer gets typed access to plot, react, restyle, relayout, purge, and events.
declare module 'plotly.js-basic-dist-min' {
  import Plotly = require('plotly.js')
  export = Plotly
}
