import { group } from "../core/group.js"
import { f, any } from "../filter/openmaptiles.js"
import * as s from "../styles/index.js"

export { GLYPHS_URL as glyphs, SPRITE_URL as sprite } from "../core/resources.js"

export const sources = {
  openmaptiles: {
    type: "vector",
    tiles: ["https://tiles-stg.dwcdn.net/no-cache/openmaptiles/v8/{z}/{x}/{y}.pbf"],
    minzoom: 0,
    maxzoom: 14,
  },
  terrain: {
    type: "vector",
    tiles: ["https://tiles-stg.dwcdn.net/no-cache/terrain/v8/{z}/{x}/{y}.pbf"],
    minzoom: 3,
    maxzoom: 10,
  },
}

const omt = { source: "openmaptiles" }
const landuse = { ...omt, sourceLayer: "landuse" }
const landcoverLayer = { ...omt, sourceLayer: "landcover" }
const terrain = { source: "terrain", sourceLayer: "relief" }
const waterway = { ...omt, sourceLayer: "waterway" }
const waterLayer = { ...omt, sourceLayer: "water" }
const transportation = { ...omt, sourceLayer: "transportation" }
const transportationName = { ...omt, sourceLayer: "transportation_name" }
const place = { ...omt, sourceLayer: "place" }

export const Landcover = group("Landcover", [
  s.LanduseResidential.apply({ ...landuse, filter: f.polygon().cls("residential") }),
  s.LandcoverIce.apply({ ...landcoverLayer, filter: f.cls("ice") }),
  s.LandcoverGrass.apply({ ...landcoverLayer, filter: f.cls("grass") }),
  s.LandcoverWood.apply({ ...landcoverLayer, filter: f.cls("wood") }),
], { sources })

export const Reliefs = group("Reliefs", [
  s.Mountains1.apply({ ...terrain, filter: f.is("shadow", 1) }),
  s.Mountains2.apply({ ...terrain, filter: f.is("shadow", 2) }),
  s.Mountains3.apply({
    ...terrain,
    filter: f.is("shadow", 3).isNot("source_id", 2598, 4847, 4851),
  }),
  s.Mountains4.apply({ ...terrain, filter: f.is("shadow", 4).isNot("source_id", 4848, 4852) }),
  s.Mountains5.apply({ ...terrain, filter: f.is("shadow", 5).isNot("source_id", 4849) }),
  s.Mountains6.apply({ ...terrain, filter: f.is("shadow", 6) }),
], { sources })

export const Water = group("Water", [
  s.Waterway.apply({ ...waterway, filter: f.line() }),
  s.Water.apply({ ...waterLayer, filter: f.polygon().clsNot("swimming_pool") }),
  s.Ocean.apply({ ...waterLayer, filter: f.cls("ocean") }),
], { sources })

const trunkOrUsState = any(f.cls("trunk", "trunk_construction"), f.is("network", "us-state"))

const majorTunnel = f
  .line()
  .tunnel()
  .cls(
    "secondary",
    "secondary_construction",
    "tertiary",
    "tertiary_construction",
    "primary",
    "primary_construction",
    "trunk",
    "trunk_construction",
  )

const Tunnels = group("Tunnels", [
  s.TunnelMinor.apply({ ...transportation, filter: f.line().tunnel().cls("minor", "minor_construction") }),
  s.TunnelMajor.apply({ ...transportation, filter: majorTunnel }),
  s.TunnelMotorway.apply({
    ...transportation,
    filter: f.line().tunnel().cls("motorway", "motorway_construction"),
  }),
], { sources })

const SurfaceRoads = group(
  "SurfaceRoads",
  [
    s.RoadService.apply({
      ...transportation,
      filter: f.line().notTunnel().cls("service", "service_construction"),
    }),
    s.RoadMinor.apply({
      ...transportation,
      filter: f.line().notTunnel().cls("minor", "minor_construction"),
    }),
    s.RoadSecondaryTertiary.apply({
      ...transportation,
      filter: f
        .line()
        .notTunnel()
        .cls("secondary", "secondary_construction", "tertiary", "tertiary_construction"),
    }),
    s.RoadPrimary.apply({
      ...transportation,
      filter: f.line().notTunnel().cls("primary", "primary_construction"),
    }),
    s.RoadTrunk.apply({ ...transportation, filter: f.line().notTunnel().where(trunkOrUsState) }),
    s.MotorwayRamp.apply({
      ...transportation,
      filter: f.line().notTunnel().cls("motorway", "motorway_construction").ramp(),
    }),
    s.Motorway.apply({
      ...transportation,
      filter: f.line().notTunnel().cls("motorway", "motorway_construction").notRamp(),
    }),
  ],
  {
    sources,
    post: [
      // RoadService is a transparent structural casing drawn beneath every fill, so
      // it stays at the front; the paved roads that follow are partitioned
      // casings-first so a later road's casing never paints over an earlier road's
      // fill at a junction.
      (layers) => {
        const isService = (layer) => layer.metadata?.iml?.style === "RoadService"
        const isCasing = (layer) => layer.id.endsWith("-casing")
        const service = layers.filter(isService)
        const paved = layers.filter((layer) => !isService(layer))

        return [...service, ...paved.sort((a, b) => Number(isCasing(b)) - Number(isCasing(a)))]
      },
    ],
  },
)

const Railways = group("Railways", [
  s.Railway.apply({ ...transportation, filter: f.cls("rail").notTunnel() }),
  s.Railway
    .apply({ ...transportation, filter: f.cls("transit").notTunnel() })
    .renameIds((id) => id.replace("railway", "railway-transit")),
], { sources })

export const Roads = group("Roads", [
  s.BridgePlatform.apply({ ...transportation, filter: f.polygon().cls("bridge") }),
  Tunnels,
  SurfaceRoads,
  Railways,
], { sources })

export const Buildings = group("Buildings", [
  s.Building.apply({
    ...omt,
    sourceLayer: "building",
    filter: any(f.gte("layer", 0), f.hasNot("layer")),
  }),
], { sources })

export const Bridges = group("Bridges", [
  s.BridgeWaterway.apply({ ...waterway, filter: f.line().bridge() }),
], { sources })

export const Boundaries = group("Boundaries", [
  s.BoundaryCountry.apply({
    ...omt,
    sourceLayer: "boundary",
    filter: f.is("admin_level", 2).is("maritime", 0),
  }),
], { sources })

const WaterLabels = group("WaterLabels", [
  s.WaterNameLineMinor.apply({ ...waterway, filter: f.line().notTunnel().clsNot("stream") }),
  s.WaterNameLineMajor.apply({ ...omt, sourceLayer: "water_name", filter: f.line() }),
  s.WaterName.apply({ ...omt, sourceLayer: "water_name", filter: f.point().clsNot("lake", "bay") }),
], { sources })

const HighwayLabels = group("HighwayLabels", [
  s.HighwayNameOther.apply({
    ...transportationName,
    filter: f.line().cls("trunk", "primary", "secondary"),
  }),
  s.HighwayNameMotorway.apply({
    ...transportationName,
    filter: f.line().cls("motorway", "motorway_construction"),
  }),
], { sources })

const PlaceLabels = group("PlaceLabels", [
  s.PlaceOther.apply({
    ...place,
    filter: f
      .point()
      .clsNot("city", "suburb", "town", "village", "province", "country", "state", "continent"),
  }),
  s.PlaceSuburb.apply({ ...place, filter: f.point().cls("suburb").lte("rank", 16) }),
  s.PlaceVillage.apply({ ...place, filter: f.point().cls("village") }),
  s.PlaceTown.apply({ ...place, filter: f.point().cls("town").lte("rank", 13) }),
  s.PlaceCity.apply({
    ...place,
    filter: f
      .point()
      .cls("city")
      .isNot("capital", 2)
      .gte("rank", 4)
      .isNot("name", "City of Westminster", "City of London"),
  }),
  s.PlaceCityLarge.apply({
    ...place,
    filter: f.point().isNot("capital", 2).lte("rank", 3).cls("city"),
  }),
  s.PlaceCapital.apply({ ...place, filter: f.point().is("capital", 2).cls("city") }),
  s.PlaceState.apply({ ...place, filter: f.point().cls("state").lte("rank", 1) }),
  s.PlaceCountryMinor.apply({ ...place, filter: f.point().cls("country").gte("rank", 2) }),
  s.PlaceCountryMajor.apply({ ...place, filter: f.point().lte("rank", 1).cls("country") }),
], { sources })

export const Labels = group(
  "Labels",
  [WaterLabels, HighwayLabels, PlaceLabels],
  {
    theme: { textField: ["name:en", "name_en", "name"] },
    sources,
  }
)

export const Graphics = group("Graphics", [
  s.Background.apply(),
  Landcover,
  Reliefs,
  Water,
  Roads,
  Buildings,
  Bridges,
  Boundaries,
  Labels,
], {
  sources,
  document: {
    name: "Graphics" 
  }
})
