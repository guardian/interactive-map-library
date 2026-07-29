import { buildGlStyle, casingsFirst } from "../core/build.js"
import { f, any } from "../core/filter/openmaptiles.js"
import * as s from "../styles/index.js"

const furniture = {
  version: 8,
  name: "Graphics",
  glyphs: "https://interactive.guim.co.uk/maptiles/fonts/{fontstack}/{range}.pbf",
  sprite: "https://tiles.dwcdn.net/sprites/dwsprites",
  metadata: {
    copyright:
      "Copyright (c) 2016, KlokanTech.com & OpenMapTiles contributors. Copyright (c) 2015, CartoDB Inc. All rights reserved. Derived from 'CartoDB Basemaps' (https://github.com/CartoDB/CartoDB-basemaps) designed by Stamen and Paul Norman for CartoDB Inc., licensed under CC-BY 3.0.",
  },
  sources: {
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
  },
}

const omt = { source: "openmaptiles", theme: { textField: ["name:en", "name_en", "name"] } }
const landcover = { ...omt, sourceLayer: "landcover" }
const water = { ...omt, sourceLayer: "water" }
const transport = { ...omt, sourceLayer: "transportation" }
const boundary = { ...omt, sourceLayer: "boundary" }

const landcoverLayers = [
  s.LanduseResidential.apply({
    ...omt,
    sourceLayer: "landuse",
    filter: f.polygon().cls("residential"),
  }),
  s.LandcoverIce.apply({ ...landcover, filter: f.cls("ice") }),
  s.LandcoverGrass.apply({ ...landcover, filter: f.cls("grass") }),
  s.LandcoverWood.apply({ ...landcover, filter: f.cls("wood") }),
]

const reliefSource = { source: "terrain", sourceLayer: "relief" }

const reliefs = [
  s.Mountains1.apply({ ...reliefSource, filter: f.is("shadow", 1) }),
  s.Mountains2.apply({ ...reliefSource, filter: f.is("shadow", 2) }),
  s.Mountains3.apply({
    ...reliefSource,
    filter: f.is("shadow", 3).isNot("source_id", 2598, 4847, 4851),
  }),
  s.Mountains4.apply({ ...reliefSource, filter: f.is("shadow", 4).isNot("source_id", 4848, 4852) }),
  s.Mountains5.apply({ ...reliefSource, filter: f.is("shadow", 5).isNot("source_id", 4849) }),
  s.Mountains6.apply({ ...reliefSource, filter: f.is("shadow", 6) }),
]

const waterLayers = [
  s.Waterway.apply({ ...omt, sourceLayer: "waterway", filter: f.line() }),
  s.Water.apply({ ...water, filter: f.polygon().clsNot("swimming_pool") }),
  s.Ocean.apply({ ...water, filter: f.cls("ocean") }),
]

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

const tunnels = [
  s.TunnelMinor.apply({
    ...transport,
    filter: f.line().tunnel().cls("minor", "minor_construction"),
  }),
  s.TunnelMajor.apply({ ...transport, filter: majorTunnel }),
  s.TunnelMotorway.apply({
    ...transport,
    filter: f.line().tunnel().cls("motorway", "motorway_construction"),
  }),
]

const surfaceRoads = [
  s.RoadService.apply({
    ...transport,
    filter: f.line().notTunnel().cls("service", "service_construction"),
  }),

  casingsFirst(
    s.RoadMinor.apply({
      ...transport,
      filter: f.line().notTunnel().cls("minor", "minor_construction"),
    }),
    s.RoadSecondaryTertiary.apply({
      ...transport,
      filter: f
        .line()
        .notTunnel()
        .cls("secondary", "secondary_construction", "tertiary", "tertiary_construction"),
    }),
    s.RoadPrimary.apply({
      ...transport,
      filter: f.line().notTunnel().cls("primary", "primary_construction"),
    }),
    s.RoadTrunk.apply({ ...transport, filter: f.line().notTunnel().where(trunkOrUsState) }),
    s.MotorwayRamp.apply({
      ...transport,
      filter: f.line().notTunnel().cls("motorway", "motorway_construction").ramp(),
    }),
    s.Motorway.apply({
      ...transport,
      filter: f.line().notTunnel().cls("motorway", "motorway_construction").notRamp(),
    }),
  ),
]

const railways = [
  s.Railway.apply({ ...transport, filter: f.cls("rail").notTunnel() }),

  s.Railway.apply({ ...transport, filter: f.cls("transit").notTunnel() }).map((layer) => ({
    ...layer,
    id: layer.id.replace("railway", "railway-transit"),
  })),
]

const roads = [
  s.BridgePlatform.apply({ ...transport, filter: f.polygon().cls("bridge") }),
  tunnels,
  surfaceRoads,
  railways,
]

const buildings = [
  s.Building.apply({
    ...omt,
    sourceLayer: "building",
    filter: any(f.gte("layer", 0), f.hasNot("layer")),
  }),
]

const bridges = [
  s.BridgeWaterway.apply({ ...omt, sourceLayer: "waterway", filter: f.line().bridge() }),
]

const boundaries = [
  s.BoundaryCountry.apply({ ...boundary, filter: f.is("admin_level", 2).is("maritime", 0) }),
]

const waterLabels = [
  s.WaterNameLineMinor.apply({
    ...omt,
    sourceLayer: "waterway",
    filter: f.line().notTunnel().clsNot("stream"),
  }),
  s.WaterNameLineMajor.apply({ ...omt, sourceLayer: "water_name", filter: f.line() }),
  s.WaterName.apply({ ...omt, sourceLayer: "water_name", filter: f.point().clsNot("lake", "bay") }),
]

const highwayLabels = [
  s.HighwayNameOther.apply({
    ...omt,
    sourceLayer: "transportation_name",
    filter: f.line().cls("trunk", "primary", "secondary"),
  }),
  s.HighwayNameMotorway.apply({
    ...omt,
    sourceLayer: "transportation_name",
    filter: f.line().cls("motorway", "motorway_construction"),
  }),
]

const place = { ...omt, sourceLayer: "place" }

const placeLabels = [
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
]

export const graphics = buildGlStyle(furniture, [
  s.Background.apply(),
  landcoverLayers,
  reliefs,
  waterLayers,
  roads,
  buildings,
  bridges,
  boundaries,
  waterLabels,
  highwayLabels,
  placeLabels,
])
