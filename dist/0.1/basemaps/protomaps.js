import { buildGlStyle, casingsFirst } from "../core/build.js"
import { f, any } from "../core/filter/protomaps.js"
import * as s from "../styles/index.js"

const furniture = {
  version: 8,
  name: "Graphics (Protomaps)",
  glyphs: "https://interactive.guim.co.uk/maptiles/fonts/{fontstack}/{range}.pbf",
  sprite: "https://tiles.dwcdn.net/sprites/dwsprites",
  metadata: {
    copyright:
      "Basemap data © OpenStreetMap contributors, served via Protomaps. Positron design derived from 'CartoDB Basemaps' designed by Stamen and Paul Norman for CartoDB Inc., licensed under CC-BY 3.0.",
  },
  sources: {
    protomaps: {
      type: "vector",
      url: "pmtiles://https://gdn-cdn.s3.amazonaws.com/maptiles/pmtiles/2025/20251208.pmtiles",
      attribution: "© OpenStreetMap",
    },
  },
}

const pm = { source: "protomaps", theme: { textField: ["name:en", "name"] } }
const landcover = { ...pm, sourceLayer: "landcover" }
const landuse = { ...pm, sourceLayer: "landuse" }
const water = { ...pm, sourceLayer: "water" }
const roads = { ...pm, sourceLayer: "roads" }
const boundaries = { ...pm, sourceLayer: "boundaries" }
const places = { ...pm, sourceLayer: "places" }

const oceanKinds = ["ocean", "sea", "bay", "strait", "fjord"]
const waterwayKinds = ["river", "stream", "canal", "ditch", "drain"]
const settlements = ["city", "town", "village", "hamlet"]

const tunnels = [
  s.TunnelMinor.apply({ ...roads, filter: f.line().tunnel().kind("minor_road") }),
  s.TunnelMajor.apply({ ...roads, filter: f.line().tunnel().kind("major_road") }),
  s.TunnelMotorway.apply({ ...roads, filter: f.line().tunnel().kind("highway") }),
]

// RoadService is a transparent structural casing with no fill, so it draws with
// the casings even though its id carries no "-casing" suffix for `casingsFirst`
// to key off. It is applied ahead of the sorted roads to sit beneath every fill.
const roadService = s.RoadService.apply({
  ...roads,
  filter: f.line().notTunnel().kind("minor_road").kindDetail("service"),
})

const surfaceRoads = [
  roadService,
  casingsFirst(
    s.RoadMinor.apply({
      ...roads,
      filter: f.line().notTunnel().kind("minor_road").kindDetailNot("service"),
    }),
    s.RoadSecondaryTertiary.apply({
      ...roads,
      filter: f.line().notTunnel().kind("major_road").kindDetail("secondary", "tertiary"),
    }),
    s.RoadPrimary.apply({ ...roads, filter: f.line().notTunnel().kindDetail("primary") }),
    s.RoadTrunk.apply({ ...roads, filter: f.line().notTunnel().kindDetail("trunk") }),
    s.MotorwayRamp.apply({ ...roads, filter: f.line().notTunnel().kind("highway", "major_road").ramp() }),
    s.Motorway.apply({ ...roads, filter: f.line().notTunnel().kind("highway").notRamp() }),
  ),
]

const railwayTransit = f
  .line()
  .notTunnel()
  .kind("rail")
  .kindDetail("transit", "light_rail", "subway", "tram")

const railways = [
  s.Railway
    .apply({ ...roads, filter: railwayTransit })
    .map((layer) => ({ ...layer, id: layer.id.replace("railway", "railway-transit") })),
  s.Railway.apply({ ...roads, filter: f.line().notTunnel().kind("rail") }),
]

// Landuse polygons re-used as landcover, kept under their landuse ids.
const landuseGrass = s.LandcoverGrass
  .apply({
    ...landuse,
    filter: f
      .polygon()
      .kind(
        "grass",
        "meadow",
        "park",
        "national_park",
        "garden",
        "recreation_ground",
        "pitch",
        "playground",
        "nature_reserve",
        "allotments",
      ),
  })
  .map((layer) => ({ ...layer, id: "landuse_grass" }))

const landuseWood = s.LandcoverWood
  .apply({ ...landuse, filter: f.polygon().kind("wood", "forest") })
  .map((layer) => ({ ...layer, id: "landuse_wood" }))

const landusePedestrian = s.BridgePlatform
  .apply({ ...landuse, filter: f.polygon().kind("pedestrian") })
  .map((layer) => ({ ...layer, id: "landuse_pedestrian" }))

const landcoverLayers = [
  s.LanduseResidential.apply({ ...landuse, filter: f.polygon().kind("residential") }),
  s.LandcoverIce.apply({ ...landcover, filter: f.kind("glacier") }),
  s.LandcoverGrass.apply({ ...landcover, filter: f.kind("grassland") }),
  landuseGrass,
  landuseWood,
]

const waterLayers = [
  s.Waterway.apply({ ...water, filter: f.line().kind(...waterwayKinds) }),
  s.Water.apply({ ...water, filter: f.polygon().kind("water", "lake", "reservoir", "dock") }),
  s.Ocean.apply({ ...water, filter: f.kind(...oceanKinds) }),
]

const aeroways = [
  s.AerowayArea.apply({ ...landuse, filter: f.polygon().kind("aerodrome") }),
  s.AerowayTaxiway.apply({ ...roads, filter: f.line().kind("aeroway").kindDetail("taxiway") }),
  s.AerowayRunway.apply({ ...roads, filter: f.line().kind("aeroway").kindDetail("runway") }),
]

const roadLayers = [
  landusePedestrian,
  s.Path.apply({ ...roads, filter: f.line().kind("path") }),
  aeroways,
  tunnels,
  surfaceRoads,
  railways,
]

const buildings = [
  s.Building.apply({ ...pm, sourceLayer: "buildings", filter: f.kind("building", "building_part") }),
]

const bridges = [s.BridgeWaterway.apply({ ...water, filter: f.line().has("bridge").kind(...waterwayKinds) })]

const boundaryLayers = [
  s.BoundaryState.apply({ ...boundaries, filter: f.line().kind("region") }),
  s.BoundaryCountry.apply({ ...boundaries, filter: f.line().kind("country") }),
]

const waterLabels = [
  s.WaterNameLineMajor.apply({ ...water, filter: f.line().kind("river") }),
  s.WaterNameLineMinor.apply({ ...water, filter: f.line().kind("canal") }),
  s.WaterName.apply({ ...water, filter: f.point() }),
]

const highwayLabels = [
  s.HighwayNameOther.apply({ ...roads, filter: f.line().kindNot("highway") }),
  s.HighwayNameMotorway.apply({ ...roads, filter: f.line().kind("highway") }),
]

const placeLabels = [
  s.PlaceSuburb.apply({ ...places, filter: f.point().kindDetail("suburb") }),
  s.PlaceOther.apply({
    ...places,
    filter: f
      .point()
      .where(
        any(
          f.kindDetail("quarter"),
          f.kind("locality").kindDetailNot(...settlements),
          f.kind("neighbourhood").kindDetail("neighbourhood"),
        ),
      ),
  }),
  s.PlaceVillage.apply({ ...places, filter: f.point().kind("locality").kindDetail("village", "hamlet") }),
  s.PlaceTown.apply({ ...places, filter: f.point().kind("locality").kindDetail("town") }),
  s.PlaceCity.apply({
    ...places,
    filter: f
      .point()
      .kind("locality")
      .kindDetail("city")
      .isNot("capital", "yes")
      .isNot("name", "City of Westminster", "City of London"),
  }),
  s.PlaceCapital.apply({ ...places, filter: f.point().kind("locality").is("capital", "yes") }),
  s.PlaceCityLarge.apply({
    ...places,
    filter: f.point().kind("locality").kindDetail("city").isNot("capital", "yes").minZoomLte(4),
  }),
  s.PlaceState.apply({ ...places, filter: f.point().kind("region") }),
  s.PlaceCountryMinor.apply({ ...places, filter: f.point().kind("country").minZoomGte(4) }),
  s.PlaceCountryMajor.apply({ ...places, filter: f.point().kind("country").minZoomLte(3) }),
]

export const protomaps = buildGlStyle(furniture, [
  s.Background.apply(),
  landcoverLayers,
  waterLayers,
  roadLayers,
  buildings,
  bridges,
  boundaryLayers,
  waterLabels,
  highwayLabels,
  placeLabels,
])
