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

const baseRoadWidth = 6.25

// prettier-ignore
const roadWidths = {
  path:              zInterpExpr({          13: 0.3, 18: 3  }, 1.6),
  minor:             zInterpExpr({          13: 0.6, 18: 28 }, 1.8),
  secondaryTertiary: zInterpExpr({ 10: 0.8, 13: 0.8, 18: 28 }, 1.6),
  primary:           zInterpExpr({ 4: 0.12, 13: 1.4, 18: 28 }, 1.4),
  trunk:             zInterpExpr({ 4: 0.2,  13: 3.0, 18: 30 }, 1.2),
  motorway:          zInterpExpr({ 4: 0.3,  13: 4.8, 18: 30 }, 1.1),
  ramp:              zInterpExpr({ 12: 1,   13: 1.6, 18: 16 }, 1.1),
}

const casing = (cap, ratio) => (w) => w + (cap * w) / (w + cap / ratio)

const roadCasing = casing(3.2, 0.5)

const tunnelOutline = (w) => Math.max(0.25, (casing(6, 0.6)(w) - w) / 2)

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

const tunnelOutlines = {
  minor: casingFor(tunnelOutline, tunnelWidths.minor),
  major: casingFor(tunnelOutline, tunnelWidths.major),
  motorway: casingFor(tunnelOutline, tunnelWidths.motorway),
}

const aerowayWidths = {
  taxiway: zInterpExpr({ 12: 1, 17: baseRoadWidth * 1.6 }, 1.5),
  runway: zInterpExpr({ 11: 4, 17: baseRoadWidth * 8 }, 1.5),
}

/** The casing colour shared by the major roads, deepening a step at z11. */
const majorRoadCasingColor = zStep(color.roadCasing, { 11: color.roadCasingStrong })

export const RoadPath = style("RoadPath", () => [
  merge(pRoundLine, pFadeIn("line-opacity", 15, 16), {
    id: "road_path",
    minzoom: 14,
    paint: {
      "line-color": color.pathFill,
      "line-width": roadWidths.path,
    },
  }),
])

// `line-gap-width` draws the line as two strokes either side of a transparent gap
// the width of the road. Where tunnels are drawn above the surface roads, a road
// that crosses over a tunnel still shows through the gap.
/** @type {Partial} */
const pTunnelOutline = {
  type: "line",
  layout: { "line-cap": "butt", "line-join": "miter" },
  paint: {
    "line-color": color.tunnelOutline,
    "line-dasharray": [4, 2],
  },
}

export const TunnelMinor = style("TunnelMinor", () => [
  merge(pTunnelOutline, pFadeIn("line-opacity", 12, 13), {
    id: "tunnel_minor",
    minzoom: 12,
    paint: {
      "line-width": tunnelOutlines.minor,
      "line-gap-width": tunnelWidths.minor,
    },
  }),
])

export const TunnelMajor = style("TunnelMajor", () => [
  merge(pTunnelOutline, pFadeIn("line-opacity", 8, 10, { min: 0.25 }), {
    id: "tunnel_major",
    paint: {
      "line-width": tunnelOutlines.major,
      "line-gap-width": tunnelWidths.major,
    },
  }),
])

export const TunnelMotorway = style("TunnelMotorway", () => [
  merge(pTunnelOutline, pFadeIn("line-opacity", 5, 10, { min: 0.25 }), {
    id: "tunnel_motorway",
    minzoom: 5,
    paint: {
      "line-width": tunnelOutlines.motorway,
      "line-gap-width": tunnelWidths.motorway,
    },
  }),
])

// A casing-shaped fill with no visible casing of its own; drawn among the
// surface-road casings so minor roads read continuously at junctions.
export const RoadService = style("RoadService", () => [
  merge(pRoundLine, pStructuralCasing, {
    id: "road_service_casing",
    minzoom: 5,
    paint: { "line-width": roadCasings.minor },
  }),
])

export const RoadMinor = style("RoadMinor", () => [
  merge(pRoundLine, pStructuralCasing, {
    id: "road_minor_casing",
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
  merge(pRoundLine, {
    id: "road_secondary_tertiary_casing",
    minzoom: 12,
    paint: {
      "line-color": majorRoadCasingColor,
      "line-width": roadCasings.secondaryTertiary,
    },
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
    id: "road_primary_casing",
    minzoom: 12,
    paint: {
      "line-color": majorRoadCasingColor,
      "line-width": roadCasings.primary,
    },
  }),
  merge(pRoundLine, pFadeIn("line-opacity", 8, 11, { min: 0.25 }), {
    id: "road_primary",
    paint: {
      "line-color": color.roadFill,
      "line-width": roadWidths.primary,
    },
  }),
])

export const RoadTrunk = style("RoadTrunk", () => [
  merge(pRoundLine, {
    id: "road_trunk_casing",
    minzoom: 12,
    paint: {
      "line-color": majorRoadCasingColor,
      "line-width": roadCasings.trunk,
    },
  }),
  merge(pRoundLine, pFadeIn("line-opacity", 7, 10, { min: 0.25 }), {
    id: "road_trunk",
    paint: {
      "line-color": color.roadFill,
      "line-width": roadWidths.trunk,
    },
  }),
])

export const RoadMotorwayRamp = style("RoadMotorwayRamp", () => [
  merge(pRoundLine, {
    id: "road_motorway_ramp_casing",
    minzoom: 12,
    paint: {
      "line-color": majorRoadCasingColor,
      "line-width": roadCasings.ramp,
    },
  }),
  merge(pRoundLine, {
    id: "road_motorway_ramp",
    minzoom: 12,
    paint: {
      "line-color": zStep(color.roadFill, {
        10: color.roadFillStrong,
        13: color.roadFill,
      }),
      "line-width": roadWidths.ramp,
    },
  }),
])

export const RoadMotorway = style("RoadMotorway", () => [
  merge(pRoundLine, {
    id: "road_motorway_casing",
    minzoom: 12,
    paint: {
      "line-color": majorRoadCasingColor,
      "line-width": roadCasings.motorway,
    },
  }),
  merge(pRoundLine, pFadeIn("line-opacity", 5, 10, { min: 0.25 }), {
    id: "road_motorway",
    minzoom: 5,
    paint: {
      "line-color": zStep(color.roadFill, {
        10: color.roadFillStrong,
        12: color.roadFill,
      }),
      "line-width": roadWidths.motorway,
    },
  }),
])

export const Rail = style("Rail", () => [
  merge(pFadeIn("line-opacity", 13, 14), {
    id: "rail_line_dash",
    type: "line",
    layout: { "line-cap": "butt" },
    paint: {
      "line-color": color.railway,
      "line-width": zStep(3, { 15: 4.5 }),
      "line-dasharray": [0.3, 4],
    },
  }),
  merge(pFadeIn("line-opacity", 13, 14), {
    id: "rail_line",
    type: "line",
    paint: {
      "line-color": color.railway,
      "line-width": zStep(0.6, { 15: 1 }),
    },
  }),
])

export const BridgeWaterway = style("BridgeWaterway", () => [
  merge(pMitreLine, {
    id: "bridge_waterway_casing",
    paint: {
      "line-color": color.bridgeOutline,
      "line-width": zInterpExpr({ 4: 0.25, 20: 40 }, 1.55),
    },
  }),
  merge(pRoundLine, {
    id: "bridge_waterway",
    paint: {
      "line-color": color.blueWater,
      "line-width": zInterpExpr({ 4: 0.25, 20: 30 }, 1.55),
    },
  }),
])

export const AerowayArea = style("AerowayArea", () => [
  merge(pFadeIn("fill-opacity", 9, 10), {
    id: "aeroway_area",
    type: "fill",
    paint: {
      "fill-color": color.aerowayFill,
      "fill-outline-color": color.aerowayOutline,
    },
  }),
])

export const AerowayTaxiway = style("AerowayTaxiway", () => [
  merge(pRoundLine, pFadeIn("line-opacity", 12, 13), {
    id: "aeroway_taxiway",
    paint: {
      "line-color": color.roadFill,
      "line-width": aerowayWidths.taxiway,
    },
  }),
])

export const AerowayRunway = style("AerowayRunway", () => [
  merge(pMitreLine, pFadeIn("line-opacity", 11, 12), {
    id: "aeroway_runway",
    paint: {
      "line-color": color.roadFill,
      "line-width": aerowayWidths.runway,
    },
  }),
])
