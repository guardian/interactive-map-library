import { compose } from "../core/style.js"
import { color } from "../tokens/colors.js"
import { tFade, tFadeIn } from "./utils/traits.js"
import { zInterp, zStep } from "./utils/zoom.js"

/**
 * @import { Trait } from "./utils/traits.js"
 * @import { StyleFn } from "../core/style.js"
 */

/** @type {Trait} */
const tFill = { type: "fill" }

/** @type {StyleFn} */
export const Background = () =>
  compose({
    id: "background",
    type: "background",
    paint: { "background-color": color.surface },
  })

/**
 * @type {Trait}
 */
const tLandFade = tFadeIn("fill-opacity", 5, 14, {
  min: 0.2,
  max: 1,
  base: 1.3,
})

/** @type {Trait} */
const tNoOutline = { paint: { "fill-outline-color": "rgba(0, 0, 0, 0)" } }

/** @type {Trait} */
const tMountainFill = compose(tFill, tNoOutline, { maxzoom: 12 })

/** @type {Trait} */
const tMountainCap = compose(tMountainFill, {
  paint: {
    "fill-color": color.iceFill,
    "fill-opacity": zInterp({ 3: 0.0041, 3.5: 0.25, 6: 0.25, 11.9: 0.0041 }, 0.3),
  },
})

/** @type {Trait} */
const tMountainShade = compose(tMountainFill, {
  paint: {
    "fill-color": color.brownMountain,
    "fill-opacity": zInterp({ 3: 0.0041, 3.5: 0.25, 6: 0.18, 11.5: 0.15, 11.9: 0.03 }, 0.3),
  },
})

/** @type {StyleFn} */
export const LanduseResidential = () =>
  // TODO: fade out to 12
  compose(tFill, tFade("fill-opacity", { in: [5, 6, { min: 0.25 }], out: [10, 11] }), {
    id: "landuse_residential",
    paint: {
      "fill-color": zStep(color.landuseResidentialFar, { 8: color.landuseResidentialNear }),
    },
  })

/** @type {StyleFn} */
export const LandcoverIce = () =>
  compose(tFill, tNoOutline, {
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
  })

/** @type {StyleFn} */
export const LandcoverGrass = () =>
  compose(tFill, tLandFade, {
    id: "landcover_grass",
    paint: {
      "fill-color": color.greenGrass,
    },
  })

/** @type {StyleFn} */
export const LandcoverWood = () =>
  compose(tFill, tLandFade, {
    id: "landcover_wood",
    paint: {
      "fill-color": color.greenWood,
    },
  })

/** @type {StyleFn} */
export const Park = () =>
  compose(tFill, tLandFade, {
    id: "park",
    paint: {
      "fill-color": color.greenPark,
    },
  })

/** @type {StyleFn} */
export const LandcoverPark = () =>
  compose(tFill, tLandFade, {
    id: "landcover_park",
    paint: {
      "fill-color": color.greenPark,
    },
  })

/** @type {StyleFn} */
export const Mountains1 = () => compose(tMountainCap, { id: "mountains_1" })

/** @type {StyleFn} */
export const Mountains2 = () => compose(tMountainCap, { id: "mountains_2" })

/** @type {StyleFn} */
export const Mountains3 = () => compose(tMountainShade, { id: "mountains_3" })

/** @type {StyleFn} */
export const Mountains4 = () => compose(tMountainShade, { id: "mountains_4" })

/** @type {StyleFn} */
export const Mountains5 = () => compose(tMountainShade, { id: "mountains_5" })

/** @type {StyleFn} */
export const Mountains6 = () => compose(tMountainShade, { id: "mountains_6" })

/** @type {StyleFn} */
export const Building = () =>
  compose(tFill, {
    id: "building",
    minzoom: 14,
    paint: {
      "fill-color": color.buildingFill,
      "fill-outline-color": color.buildingOutline,
      "fill-antialias": true,
    },
  })

/** @type {StyleFn} */
export const Building3d = () =>
  compose({
    id: "building3d",
    type: "fill-extrusion",
    minzoom: 14,
    // Extrusion height/base read from a feature attribute whose name is
    // schema-specific, so each build supplies them via `patch:` on the layer.
    paint: {
      "fill-extrusion-color": color.taupeBuilding,
      "fill-extrusion-opacity": 0.7,
    },
  })
