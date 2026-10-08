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

export const WaterWaterway = style("WaterWaterway", () => [
  merge(pFadeIn("line-opacity", 8, 10, { max: 1 }), {
    id: "water_waterway",
    type: "line",
    paint: {
      "line-color": color.blueWaterOutline,
      "line-width": 1,
    },
  }),
])

export const WaterBody = style("WaterBody", () => [
  merge(pFadeIn("line-opacity", 4, 10), {
    id: "water_body_outline",
    type: "line",
    paint: {
      "line-color": color.blueWaterOutline,
      "line-width": zStep(1, { 13: 2 }),
    },
  }),
  merge(pWaterFill, { id: "water_body" }),
])

export const WaterOcean = style("WaterOcean", () => [
  merge({
    id: "water_ocean_outline",
    type: "line",
    paint: { "line-color": color.blueWaterOutline, "line-width": 2 },
  }),
  merge(pWaterFill, { id: "water_ocean" }),
])
