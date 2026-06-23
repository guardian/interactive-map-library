import { Stylesheet } from "../core/stylesheet.js"
import { f, any } from "../core/filter/protomaps.js"
import * as s from "../styles/index.js"

const { defaults, group, layer, build } = new Stylesheet({
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
})

layer(s.Background)

defaults({ source: "protomaps", theme: { textField: ["name:en", "name"] } })

// Landuse & landcover -------------------------------------------------------

layer(s.LanduseResidential, { sourceLayer: "landuse", filter: f.polygon().kind("residential") })

group({ sourceLayer: "landcover" }).within((layer) => {
  layer(s.LandcoverIce, { filter: f.kind("glacier") })
  layer(s.LandcoverGrass, { filter: f.kind("grassland") })
})

layer(s.LandcoverGrass, {
  sourceLayer: "landuse",
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
  id: "landuse_grass",
})

layer(s.LandcoverWood, {
  sourceLayer: "landuse",
  filter: f.polygon().kind("wood", "forest"),
  id: "landuse_wood",
})

// Water ---------------------------------------------------------------------

const oceanKinds = ["ocean", "sea", "bay", "strait", "fjord"]
const waterwayKinds = ["river", "stream", "canal", "ditch", "drain"]

group({ sourceLayer: "water" }).within((layer) => {
  layer(s.Waterway, { filter: f.line().kind(...waterwayKinds) })
  layer(s.WaterOutline, { filter: f.polygon().kind("water", "lake", "reservoir", "dock") })
  layer(s.Water, { filter: f.polygon().kind("water", "lake", "reservoir", "dock") })
  layer(s.OceanOutline, { filter: f.kind(...oceanKinds) })
  layer(s.Ocean, { filter: f.kind(...oceanKinds) })
})

layer(s.BridgePlatform, {
  sourceLayer: "landuse",
  filter: f.polygon().kind("pedestrian"),
  id: "landuse_pedestrian",
})

// Roads ---------------------------------------------------------------------

layer(s.Path, { sourceLayer: "roads", filter: f.line().kind("path") })

layer(s.AerowayArea, { sourceLayer: "landuse", filter: f.polygon().kind("aerodrome") })

group({ sourceLayer: "roads", filter: f.line() }).within((layer) => {
  layer(s.AerowayTaxiway, { filter: f.kind("aeroway").kindDetail("taxiway") })
  layer(s.AerowayRunway, { filter: f.kind("aeroway").kindDetail("runway") })

  layer(s.TunnelMinorCasing, { filter: f.tunnel().kind("minor_road") })
  layer(s.TunnelMinor, { filter: f.tunnel().kind("minor_road") })
  layer(s.TunnelMajorCasing, { filter: f.tunnel().kind("major_road") })
  layer(s.TunnelMajor, { filter: f.tunnel().kind("major_road") })
  layer(s.TunnelMotorwayCasing, { filter: f.tunnel().kind("highway") })
  layer(s.TunnelMotorway, { filter: f.tunnel().kind("highway") })

  layer(s.RoadMinorCasing, { filter: f.notTunnel().kind("minor_road").kindDetailNot("service") })
  layer(s.RoadService, { filter: f.notTunnel().kind("minor_road").kindDetail("service") })
  layer(s.RoadSecondaryTertiaryCasing, {
    filter: f.notTunnel().kind("major_road").kindDetail("secondary", "tertiary"),
  })
  layer(s.RoadTrunkCasing, { filter: f.notTunnel().kindDetail("trunk") })
  layer(s.MotorwayRampCasing, { filter: f.notTunnel().kind("highway", "major_road").ramp() })
  layer(s.MotorwayCasing, { filter: f.notTunnel().kind("highway").notRamp() })

  layer(s.RoadMinor, { filter: f.notTunnel().kind("minor_road").kindDetailNot("service") })
  layer(s.RoadSecondaryTertiary, {
    filter: f.notTunnel().kind("major_road").kindDetail("secondary", "tertiary"),
  })
  layer(s.RoadPrimary, { filter: f.notTunnel().kindDetail("primary") })
  layer(s.RoadTrunk, { filter: f.notTunnel().kindDetail("trunk") })
  layer(s.MotorwayRamp, { filter: f.notTunnel().kind("highway", "major_road").ramp() })
  layer(s.Motorway, { filter: f.notTunnel().kind("highway").notRamp() })

  const railwayTransitFilter = f
    .notTunnel()
    .kind("rail")
    .kindDetail("transit", "light_rail", "subway", "tram")

  layer(s.Railway, { id: "railway-transit", filter: railwayTransitFilter })
  layer(s.RailwayDash, { id: "railway-transit-dash", filter: railwayTransitFilter })

  layer(s.Railway, { id: "railway", filter: f.notTunnel().kind("rail") })
  layer(s.RailwayDash, { id: "railway-dash", filter: f.notTunnel().kind("rail") })
})

// Buildings -----------------------------------------------------------------

layer(s.Building, { sourceLayer: "buildings", filter: f.kind("building", "building_part") })

// Bridges -------------------------------------------------------------------

group({ sourceLayer: "water", filter: f.line() }).within((layer) => {
  layer(s.BridgeWaterwayCasing, { filter: f.has("bridge").kind(...waterwayKinds) })
  layer(s.BridgeWaterway, { filter: f.has("bridge").kind(...waterwayKinds) })
})

// Boundaries ----------------------------------------------------------------

group({ sourceLayer: "boundaries" }).within((layer) => {
  layer(s.BoundaryState, { filter: f.line().kind("region") })
  layer(s.BoundaryCountry, { filter: f.line().kind("country") })
})

// Labels --------------------------------------------------------------------

group({ sourceLayer: "water", filter: f.line() }).within((layer) => {
  layer(s.WaterNameLineMajor, { filter: f.kind("river") })
  layer(s.WaterNameLineMinor, { filter: f.kind("canal") })
})

layer(s.WaterName, { sourceLayer: "water", filter: f.point() })

group({ sourceLayer: "roads" }).within((layer) => {
  layer(s.HighwayNameOther, { filter: f.line().kindNot("highway") })
  layer(s.HighwayNameMotorway, { filter: f.line().kind("highway") })
})

const settlements = ["city", "town", "village", "hamlet"]

group({ sourceLayer: "places", filter: f.point() }).within((layer) => {
  layer(s.PlaceSuburb, { filter: f.kindDetail("suburb") })
  layer(s.PlaceOther, {
    filter: any(
      f.kindDetail("quarter"),
      f.kind("locality").kindDetailNot(...settlements),
      f.kind("neighbourhood").kindDetail("neighbourhood"),
    ),
  })

  layer(s.PlaceVillage, { filter: f.kind("locality").kindDetail("village", "hamlet") })
  layer(s.PlaceTown, { filter: f.kind("locality").kindDetail("town") })

  layer(s.PlaceCity, {
    filter: f
      .kind("locality")
      .kindDetail("city")
      .isNot("capital", "yes")
      .isNot("name", "City of Westminster", "City of London"),
  })

  layer(s.PlaceCapital, { filter: f.kind("locality").is("capital", "yes") })
  layer(s.PlaceCityLarge, {
    filter: f.kind("locality").kindDetail("city").isNot("capital", "yes").minZoomLte(4),
  })

  layer(s.PlaceState, { filter: f.kind("region") })
  layer(s.PlaceCountryMinor, { filter: f.kind("country").minZoomGte(4) })
  layer(s.PlaceCountryMajor, { filter: f.kind("country").minZoomLte(3) })
})

export const protomaps = build()
