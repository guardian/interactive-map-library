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
  base: 1.2,
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
    "fill-opacity": zInterp(
      {
        3: 0.0041,
        3.5: 0.25,
        6: 0.18,
        11.5: 0.15,
        11.9: 0.03,
      },
      0.3,
    ),
  },
})

export const LandResidential = style("LandResidential", () => [
  // TODO: fade out to 12
  merge(pFill, pFade("fill-opacity", { in: [5, 6, { min: 0.25 }], out: [9, 11] }), {
    id: "land_residential",
    paint: {
      "fill-color": color.landuseResidential,
    },
  }),
])

export const LandIce = style("LandIce", () => [
  merge(pFill, pNoOutline, {
    id: "land_ice",
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

export const LandGrass = style("LandGrass", () => [
  merge(pFill, pLandFade, {
    id: "land_grass",
    paint: {
      "fill-color": color.greenGrass,
    },
  }),
])

export const LandWood = style("LandWood", () => [
  merge(pFill, pLandFade, {
    id: "land_wood",
    paint: {
      "fill-color": color.greenWood,
    },
  }),
])

export const LandPark = style("LandPark", () => [
  merge(pFill, pLandFade, {
    id: "land_park",
    paint: {
      "fill-color": color.greenPark,
    },
  }),
])

export const LandPedestrian = style("LandPedestrian", () => [
  merge(pFill, {
    id: "land_pedestrian",
    paint: {
      "fill-color": color.surface,
      "fill-outline-color": color.bridgeOutline,
    },
  }),
])

export const TerrainMountain1 = style("TerrainMountain1", () => [
  merge(pMountainCap, { id: "terrain_mountain_1" }),
])

export const TerrainMountain2 = style("TerrainMountain2", () => [
  merge(pMountainCap, { id: "terrain_mountain_2" }),
])

export const TerrainMountain3 = style("TerrainMountain3", () => [
  merge(pMountainShade, { id: "terrain_mountain_3" }),
])

export const TerrainMountain4 = style("TerrainMountain4", () => [
  merge(pMountainShade, { id: "terrain_mountain_4" }),
])

export const TerrainMountain5 = style("TerrainMountain5", () => [
  merge(pMountainShade, { id: "terrain_mountain_5" }),
])

export const TerrainMountain6 = style("TerrainMountain6", () => [
  merge(pMountainShade, { id: "terrain_mountain_6" }),
])

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

export const BuildingExtrusion = style("BuildingExtrusion", () => [
  merge({
    id: "building_extrusion",
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
