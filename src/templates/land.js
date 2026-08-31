import { merge, style } from "../core/style.js"
import { color } from "../tokens/colors.js"
import { pFade, pFadeIn } from "./utils/partials.js"
import { zInterp, zStep } from "./utils/zoom.js"

/** @import { Partial } from "./utils/partials.js" */

/** @type {Partial} */
const pFill = { type: "fill" }

export const Background = style("Background", () => [
  merge({
    id: "background",
    type: "background",
    paint: { "background-color": color.surface },
  }),
])

/** @type {Partial} */
const pLandFade = pFadeIn("fill-opacity", 5, 14, {
  min: 0.2,
  max: 1,
  base: 1.3,
})

/** @type {Partial} */
const pNoOutline = { paint: { "fill-outline-color": "rgba(0, 0, 0, 0)" } }

/** @type {Partial} */
const pMountainFill = merge(pFill, pNoOutline, { maxzoom: 12 })

/** @type {Partial} */
const pMountainCap = merge(pMountainFill, {
  paint: {
    "fill-color": color.iceFill,
    "fill-opacity": zInterp({ 3: 0.0041, 3.5: 0.25, 6: 0.25, 11.9: 0.0041 }, 0.3),
  },
})

/** @type {Partial} */
const pMountainShade = merge(pMountainFill, {
  paint: {
    "fill-color": color.brownMountain,
    "fill-opacity": zInterp({ 3: 0.0041, 3.5: 0.25, 6: 0.18, 11.5: 0.15, 11.9: 0.03 }, 0.3),
  },
})

export const LanduseResidential = style("LanduseResidential", () => [
  // TODO: fade out to 12
  merge(pFill, pFade("fill-opacity", { in: [5, 6, { min: 0.25 }], out: [10, 11] }), {
    id: "landuse_residential",
    paint: {
      "fill-color": zStep(color.landuseResidentialFar, { 8: color.landuseResidentialNear }),
    },
  }),
])

export const LandcoverIce = style("LandcoverIce", () => [
  merge(pFill, pNoOutline, {
    id: "landcover_ice",
    paint: {
      "fill-color": color.iceFill,
      // TODO: this doesn't look quite right...
      "fill-opacity": zInterp(
        {
          0: 0.9,
          3.99: 0.75,
          4: 0.65,
          6.99: 0.4325,
          7: 0.5625,
          7.99: 0.5,
          8: 0.375,
          8.99: 0.375,
          9: 0.5,
        },
        1,
      ),
    },
  }),
])

export const LandcoverGrass = style("LandcoverGrass", () => [
  merge(pFill, pLandFade, {
    id: "landcover_grass",
    paint: {
      "fill-color": color.greenGrass,
    },
  }),
])

export const LandcoverWood = style("LandcoverWood", () => [
  merge(pFill, pLandFade, {
    id: "landcover_wood",
    paint: {
      "fill-color": color.greenWood,
    },
  }),
])

export const Park = style("Park", () => [
  merge(pFill, pLandFade, {
    id: "park",
    paint: {
      "fill-color": color.greenPark,
    },
  }),
])

export const LandcoverPark = style("LandcoverPark", () => [
  merge(pFill, pLandFade, {
    id: "landcover_park",
    paint: {
      "fill-color": color.greenPark,
    },
  }),
])

export const Mountains1 = style("Mountains1", () => [merge(pMountainCap, { id: "mountains_1" })])

export const Mountains2 = style("Mountains2", () => [merge(pMountainCap, { id: "mountains_2" })])

export const Mountains3 = style("Mountains3", () => [merge(pMountainShade, { id: "mountains_3" })])

export const Mountains4 = style("Mountains4", () => [merge(pMountainShade, { id: "mountains_4" })])

export const Mountains5 = style("Mountains5", () => [merge(pMountainShade, { id: "mountains_5" })])

export const Mountains6 = style("Mountains6", () => [merge(pMountainShade, { id: "mountains_6" })])

export const Building = style("Building", () => [
  merge(pFill, {
    id: "building",
    minzoom: 14,
    paint: {
      "fill-color": color.buildingFill,
      "fill-outline-color": color.buildingOutline,
      "fill-antialias": true,
    },
  }),
])

export const Building3d = style("Building3d", () => [
  merge({
    id: "building3d",
    type: "fill-extrusion",
    minzoom: 14,
    // Extrusion height/base read from a feature attribute whose name is
    // schema-specific, so each build supplies them via `patch:` on the layer.
    paint: {
      "fill-extrusion-color": color.taupeBuilding,
      "fill-extrusion-opacity": 0.7,
    },
  }),
])
