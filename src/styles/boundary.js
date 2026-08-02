import { merge, style } from "../core/style.js"
import { color } from "../tokens/colors.js"
import { pFadeIn } from "./utils/partials.js"
import { zInterp } from "./utils/zoom.js"

/** @import { Partial } from "./utils/partials.js" */

/** @type {Partial} */
const pBoundaryLine = {
  type: "line",
  layout: { "line-cap": "round", "line-join": "round" },
}

export const BoundaryState = style("BoundaryState", () => [
  merge(pBoundaryLine, pFadeIn("line-opacity", 2, 4, { min: 0, max: 0.625 }), {
    id: "boundary_state",
    maxzoom: 8,
    paint: {
      "line-width": 1,
      "line-color": color.boundaryState,
      "line-dasharray": zInterp({ 0: [4, 3], 12: [6, 4] }),
    },
  }),
])

export const BoundaryCountry = style("BoundaryCountry", () => [
  merge(pBoundaryLine, {
    id: "boundary_country",
    maxzoom: 8,
    paint: {
      "line-color": color.boundaryCountry,
      "line-width": zInterp({ 0: 0.5, 5: 1, 7: 1.5 }),
      "line-blur": 1,
    },
  }),
])
