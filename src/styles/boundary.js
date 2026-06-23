import { compose } from "../core/style.js"
import { color } from "../tokens/colors.js"
import { tFade, tFadeIn } from "./utils/traits.js"
import { zInterp } from "./utils/zoom.js"

/**
 * @import { Trait } from "./utils/traits.js"
 * @import { StyleFn } from "../core/style.js"
 */

/** @type {Trait} */
const tBoundaryLine = {
  type: "line",
  layout: { "line-cap": "round", "line-join": "round" },
}

/** @type {StyleFn} */
export const BoundaryState = () =>
  compose(tBoundaryLine, tFadeIn("line-opacity", 2, 4, { min: 0, max: 0.625 }), {
    id: "boundary_state",
    maxzoom: 8,
    paint: {
      "line-width": 1,
      "line-color": color.boundaryState,
      "line-dasharray": zInterp({ 0: [4, 3], 12: [6, 4] }),
    },
  })

/** @type {StyleFn} */
export const BoundaryCountry = () =>
  compose(tBoundaryLine, {
    id: "boundary_country",
    maxzoom: 8,
    paint: {
      "line-color": color.boundaryCountry,
      "line-width": zInterp({ 0: 0.5, 5: 1, 7: 1.5 }),
      "line-blur": 1,
    },
  })
