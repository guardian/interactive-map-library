import { tFadeIn } from "./utils/traits.js"
import { compose } from "../core/style.js"
import { color } from "../tokens/colors.js"
import { zStep } from "./utils/zoom.js"

/**
 * @import { Trait } from "./utils/traits.js"
 * @import { StyleFn } from "../core/style.js"
 */

/** @type {Trait} */
const tWaterFill = {
  type: "fill",
  paint: { "fill-color": color.blueWater, "fill-antialias": true },
}

/** @type {StyleFn} */
export const Waterway = (theme) => {
  return compose(tFadeIn("line-opacity", 8, 10, { max: 1 }), {
    id: "waterway",
    type: "line",
    paint: {
      "line-color": color.blueWaterOutline,
      "line-width": 1,
    },
  })
}

/** @type {StyleFn} */
export const WaterOutline = () =>
  compose(tFadeIn("line-opacity", 4, 10), {
    id: "water-outline",
    type: "line",
    paint: {
      "line-color": color.blueWaterOutline,
      "line-width": zStep(1, { 13: 2 }),
    },
  })

/** @type {StyleFn} */
export const Water = () => compose(tWaterFill, { id: "water" })

/** @type {StyleFn} */
export const OceanOutline = () =>
  compose({
    id: "ocean-outline",
    type: "line",
    paint: { "line-color": color.blueWaterOutline, "line-width": 2 },
  })

/** @type {StyleFn} */
export const Ocean = () => compose(tWaterFill, { id: "ocean" })
