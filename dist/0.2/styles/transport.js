import { merge, style } from "../core/style.js"
import { color } from "../tokens/colors.js"
import { pFadeIn } from "./utils/partials.js"
import { zInterpExpr, zStep } from "./utils/zoom.js"

/** @import { Partial } from "./utils/partials.js" */

/** @type {Partial} */
const pRoundLine = {
  type: "line",
  layout: { "line-cap": "round", "line-join": "round" },
}

/** @type {Partial} */
const pMitreLine = {
  type: "line",
  layout: { "line-cap": "butt", "line-join": "miter" },
}

/** @type {Partial} */
const pStructuralCasing = {
  paint: { "line-color": "rgba(0, 0, 0, 0)" },
}

/** @type {Partial} */
const pOverlayLine = {
  paint: { "line-color": color.overlaySurface },
}

const baseRoadWidth = 6.25

// prettier-ignore
const roadWidths = {
  path:              zInterpExpr({          13: 0.4, 18: 6  }, 1.6),
  minor:             zInterpExpr({          13: 0.6, 18: 28 }, 1.8),
  secondaryTertiary: zInterpExpr({ 10: 0.8, 13: 1.0, 18: 28 }, 1.6),
  primary:           zInterpExpr({ 4: 0.12, 13: 2.0, 18: 30 }, 1.4),
  trunk:             zInterpExpr({ 4: 0.14, 13: 3.4, 18: 30 }, 1.2),
  motorway:          zInterpExpr({ 4: 0.26, 13: 5.0, 18: 32 }, 1.1),
  ramp:              zInterpExpr({ 12: 1,   13: 1.6, 18: 16 }, 1.1),
}

const casing = (cap, ratio) => (w) => w + (cap * w) / (w + cap / ratio)

const roadCasing = casing(3.2, 0.5)

const tunnelCasing = casing(6, 0.6)

// `widthExpr` is `["interpolate", ["exponential", base], ["zoom"], zoom, value, ...]`:
// a 3-element head followed by `zoom, value` stop pairs. We rewrite each stop's
// value (every second element after the head) through `fn`, leaving the head and
// zoom keys untouched.
const casingFor = (fn, widthExpr) =>
  widthExpr.map((item, i) => (i >= 4 && (i - 3) % 2 === 1 ? fn(item) : item))

const roadCasings = {
  ramp: casingFor(roadCasing, roadWidths.ramp),
  minor: casingFor(roadCasing, roadWidths.minor),
  secondaryTertiary: casingFor(roadCasing, roadWidths.secondaryTertiary),
  primary: casingFor(roadCasing, roadWidths.primary),
  trunk: casingFor(roadCasing, roadWidths.trunk),
  motorway: casingFor(roadCasing, roadWidths.motorway),
}

const tunnelWidths = {
  minor: roadWidths.minor,
  major: roadWidths.primary,
  motorway: roadWidths.motorway,
}

const tunnelCasings = {
  minor: casingFor(tunnelCasing, tunnelWidths.minor),
  major: casingFor(tunnelCasing, tunnelWidths.major),
  motorway: casingFor(tunnelCasing, tunnelWidths.motorway),
}

const aerowayWidths = {
  taxiway: zInterpExpr({ 12: 1, 17: baseRoadWidth * 1.6 }, 1.5),
  runway: zInterpExpr({ 11: 4, 17: baseRoadWidth * 8 }, 1.5),
}

/** The casing colour shared by the major roads, deepening a step at z11. */
const majorRoadCasingColor = zStep(color.roadCasing, { 11: color.roadCasingStrong })

export const Path = style("Path", () => [
  merge(pRoundLine, pFadeIn("line-opacity", 14, 15), {
    id: "road_path",
    minzoom: 14,
    paint: {
      "line-color": color.pathFill,
      "line-width": roadWidths.path,
    },
  }),
])

// Dasharray units are line-widths, so the pattern grows with the road as it
// widens; halving it at z13 keeps the dashes denser through the mid-to-high
// zooms rather than spreading into sparse slabs.
/** @type {Partial} */
const pTunnelCasing = {
  type: "line",
  layout: { "line-cap": "butt", "line-join": "miter" },
  paint: {
    "line-color": color.roadCasing,
    "line-dasharray": zStep([0.8, 0.4], { 13: [0.4, 0.2] }),
  },
}

/** @type {Partial} */
const pTunnelFill = {
  type: "line",
  layout: { "line-cap": "butt", "line-join": "miter" },
  paint: { "line-color": zStep("#e8e8e8", { 14: color.pathFill }) },
}

export const TunnelMinor = style("TunnelMinor", () => [
  merge(pTunnelCasing, pFadeIn("line-opacity", 12, 13), {
    id: "tunnel_minor-casing",
    minzoom: 12,
    paint: { "line-width": tunnelCasings.minor },
  }),
  merge(pTunnelFill, pFadeIn("line-opacity", 12, 13), {
    id: "tunnel_minor",
    minzoom: 12,
    paint: {
      "line-width": tunnelWidths.minor,
    },
  }),
])

export const TunnelMajor = style("TunnelMajor", () => [
  merge(pTunnelCasing, pFadeIn("line-opacity", 8, 10, { min: 0.25 }), {
    id: "tunnel_major-casing",
    paint: { "line-width": tunnelCasings.major },
  }),
  merge(pTunnelFill, pFadeIn("line-opacity", 8, 10, { min: 0.25 }), {
    id: "tunnel_major",
    paint: {
      "line-width": tunnelWidths.major,
    },
  }),
])

export const TunnelMotorway = style("TunnelMotorway", () => [
  merge(pTunnelCasing, pFadeIn("line-opacity", 5, 10, { min: 0.25 }), {
    id: "tunnel_motorway-casing",
    minzoom: 5,
    paint: { "line-width": tunnelCasings.motorway },
  }),
  merge(pTunnelFill, pFadeIn("line-opacity", 5, 10, { min: 0.25 }), {
    id: "tunnel_motorway",
    minzoom: 5,
    paint: {
      "line-width": tunnelWidths.motorway,
    },
  }),
])

// A casing-shaped fill with no visible casing of its own; drawn among the
// surface-road casings so minor roads read continuously at junctions.
export const RoadService = style("RoadService", () => [
  merge(pRoundLine, pStructuralCasing, {
    id: "road_service",
    minzoom: 5,
    paint: { "line-width": roadCasings.minor },
  }),
])

export const RoadMinor = style("RoadMinor", () => [
  merge(pRoundLine, pStructuralCasing, {
    id: "road_minor-casing",
    minzoom: 5,
    paint: { "line-width": roadCasings.minor },
  }),
  merge(pRoundLine, pFadeIn("line-opacity", 12, 13), {
    id: "road_minor",
    minzoom: 12,
    paint: {
      "line-color": color.roadFill,
      "line-width": roadWidths.minor,
      "line-translate-anchor": "map",
    },
  }),
])

export const RoadSecondaryTertiary = style("RoadSecondaryTertiary", () => [
  merge(pRoundLine, pStructuralCasing, {
    id: "road_secondary_tertiary-casing",
    minzoom: 6,
    paint: { "line-width": roadCasings.secondaryTertiary },
  }),
  merge(pRoundLine, pFadeIn("line-opacity", 10, 12), {
    id: "road_secondary_tertiary",
    minzoom: 10,
    paint: {
      "line-color": color.roadFill,
      "line-width": roadWidths.secondaryTertiary,
    },
  }),
])

export const RoadPrimary = style("RoadPrimary", () => [
  merge(pRoundLine, {
    id: "road_primary-casing",
    minzoom: 12,
    paint: {
      "line-color": majorRoadCasingColor,
      "line-width": roadCasings.primary,
    },
  }),
  merge(pRoundLine, pFadeIn("line-opacity", 8, 10, { min: 0.25 }), {
    id: "road_primary",
    paint: {
      "line-color": color.roadFill,
      "line-width": roadWidths.primary,
    },
  }),
])

export const RoadTrunk = style("RoadTrunk", () => [
  merge(pRoundLine, {
    id: "road_trunk-casing",
    minzoom: 12,
    paint: {
      "line-color": majorRoadCasingColor,
      "line-width": roadCasings.trunk,
    },
  }),
  merge(pRoundLine, pFadeIn("line-opacity", 7, 12, { min: 0.25 }), {
    id: "road_trunk",
    paint: {
      "line-color": zStep(color.roadFill, { 11: color.roadFillStrong }),
      "line-width": roadWidths.trunk,
    },
  }),
])

export const MotorwayRamp = style("MotorwayRamp", () => [
  merge(pRoundLine, {
    id: "road_major_motorway_ramp-casing",
    minzoom: 12,
    paint: {
      "line-color": majorRoadCasingColor,
      "line-width": roadCasings.ramp,
    },
  }),
  merge(pRoundLine, {
    id: "road_major_motorway_ramp",
    minzoom: 12,
    paint: {
      "line-color": zStep(color.roadFill, { 9: color.roadFillStrong }),
      "line-width": roadWidths.ramp,
    },
  }),
])

export const Motorway = style("Motorway", () => [
  merge(pRoundLine, {
    id: "road_major_motorway-casing",
    minzoom: 12,
    paint: {
      "line-color": majorRoadCasingColor,
      "line-width": roadCasings.motorway,
    },
  }),
  merge(pRoundLine, pFadeIn("line-opacity", 5, 10, { min: 0.25 }), {
    id: "road_major_motorway",
    minzoom: 5,
    paint: {
      "line-color": zStep(color.roadFill, { 10: color.roadFillStrong }),
      "line-width": roadWidths.motorway,
    },
  }),
])

/** @type {Partial} */
const pRailwayBase = merge(pFadeIn("line-opacity", 13, 14), {
  type: "line",
  paint: {
    "line-color": color.railway,
    "line-width": zStep(0.6, { 15: 1 }),
  },
})

/** @type {Partial} */
const pRailwayDash = merge(pFadeIn("line-opacity", 13, 14), {
  type: "line",
  layout: { "line-cap": "butt" },
  paint: {
    "line-color": color.railway,
    "line-width": zStep(3, { 15: 4.5 }),
    "line-dasharray": [0.33, 2.7],
  },
})

export const Railway = style("Railway", () => [
  merge(pRailwayBase, { id: "railway" }),
  merge(pRailwayDash, { id: "railway-dash" }),
])

export const BridgePlatform = style("BridgePlatform", () => [
  merge({
    id: "bridge_platform",
    type: "fill",
    paint: {
      "fill-color": color.surface,
      "fill-outline-color": color.bridgeOutline,
    },
  }),
])

export const BridgeWaterway = style("BridgeWaterway", () => [
  merge(pMitreLine, {
    id: "waterway-bridge-casing",
    paint: {
      "line-color": color.bridgeOutline,
      "line-width": zInterpExpr({ 4: 0.25, 20: 40 }, 1.55),
    },
  }),
  merge(pRoundLine, {
    id: "waterway-bridge",
    paint: {
      "line-color": color.blueWater,
      "line-width": zInterpExpr({ 4: 0.25, 20: 30 }, 1.55),
    },
  }),
])

export const AerowayArea = style("AerowayArea", () => [
  merge({
    id: "aeroway-area",
    type: "fill",
    minzoom: 14,
    paint: {
      "fill-color": color.overlaySurface,
    },
  }),
])

export const AerowayTaxiway = style("AerowayTaxiway", () => [
  merge(pRoundLine, pOverlayLine, {
    id: "aeroway-taxiway",
    minzoom: 12,
    paint: {
      "line-width": aerowayWidths.taxiway,
    },
  }),
])

export const AerowayRunway = style("AerowayRunway", () => [
  merge(pRoundLine, pOverlayLine, {
    id: "aeroway-runway",
    minzoom: 4,
    paint: {
      "line-width": aerowayWidths.runway,
    },
  }),
])
