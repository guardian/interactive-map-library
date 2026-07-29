import { pFadeIn } from "./utils/partials.js"
import { merge, style } from "../core/style.js"
import { color } from "../tokens/colors.js"
import { zStep } from "./utils/zoom.js"

/** @import { Partial } from "./utils/partials.js" */

/** @type {Partial} */
const pWaterFill = {
  type: "fill",
  paint: { "fill-color": color.blueWater, "fill-antialias": true },
}

export const Waterway = style(() => [
  merge(pFadeIn("line-opacity", 8, 10, { max: 1 }), {
    id: "waterway",
    type: "line",
    paint: {
      "line-color": color.blueWaterOutline,
      "line-width": 1,
    },
  }),
])

export const Water = style(() => [
  merge(pFadeIn("line-opacity", 4, 10), {
    id: "water-outline",
    type: "line",
    paint: {
      "line-color": color.blueWaterOutline,
      "line-width": zStep(1, { 13: 2 }),
    },
  }),
  merge(pWaterFill, { id: "water" }),
])

export const Ocean = style(() => [
  merge({
    id: "ocean-outline",
    type: "line",
    paint: { "line-color": color.blueWaterOutline, "line-width": 2 },
  }),
  merge(pWaterFill, { id: "ocean" }),
])
