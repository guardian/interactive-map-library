import { group } from "../core/group.js"
import { f, any } from "../filter/protomaps.js"
import * as s from "../styles/index.js"

export { GLYPHS_URL as glyphs, SPRITE_URL as sprite } from "../core/resources.js"

export const sources = {
  protomaps: {
    type: "vector",
    url: "pmtiles://https://gdn-cdn.s3.amazonaws.com/maptiles/pmtiles/2025/20251208.pmtiles",
    attribution: "© OpenStreetMap",
  },
}

const oceanKinds = ["ocean", "sea", "bay", "strait", "fjord"]
const waterwayKinds = ["river", "stream", "canal", "ditch", "drain"]
const settlements = ["city", "town", "village", "hamlet"]

const pm = { source: "protomaps" }
const landuse = { ...pm, sourceLayer: "landuse" }
const landcoverLayer = { ...pm, sourceLayer: "landcover" }
const roadsLayer = { ...pm, sourceLayer: "roads" }
const waterLayer = { ...pm, sourceLayer: "water" }
const boundariesLayer = { ...pm, sourceLayer: "boundaries" }
const places = { ...pm, sourceLayer: "places" }

const Tunnels = group("Tunnels", [
  s.TunnelMinor.apply({ ...roadsLayer, filter: f.line().tunnel().kind("minor_road") }),
  s.TunnelMajor.apply({ ...roadsLayer, filter: f.line().tunnel().kind("major_road") }),
  s.TunnelMotorway.apply({ ...roadsLayer, filter: f.line().tunnel().kind("highway") }),
], { sources })

const SurfaceRoads = group(
  "SurfaceRoads",
  [
    s.RoadService.apply({
      ...roadsLayer,
      filter: f.line().notTunnel().kind("minor_road").kindDetail("service"),
    }),
    s.RoadMinor.apply({
      ...roadsLayer,
      filter: f.line().notTunnel().kind("minor_road").kindDetailNot("service"),
    }),
    s.RoadSecondaryTertiary.apply({
      ...roadsLayer,
      filter: f.line().notTunnel().kind("major_road").kindDetail("secondary", "tertiary"),
    }),
    s.RoadPrimary.apply({ ...roadsLayer, filter: f.line().notTunnel().kindDetail("primary") }),
    s.RoadTrunk.apply({ ...roadsLayer, filter: f.line().notTunnel().kindDetail("trunk") }),
    s.MotorwayRamp.apply({
      ...roadsLayer,
      filter: f.line().notTunnel().kind("highway", "major_road").ramp(),
    }),
    s.Motorway.apply({ ...roadsLayer, filter: f.line().notTunnel().kind("highway").notRamp() }),
  ],
  {
    sources,
    post: [
      // RoadService is a transparent structural casing with no fill and no "-casing"
      // suffix, so it stays pinned at the front to sit beneath every fill; the paved
      // roads that follow are partitioned casings-first so a later road's casing
      // never paints over an earlier road's fill at a junction.
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

const railwayTransit = f
  .line()
  .notTunnel()
  .kind("rail")
  .kindDetail("transit", "light_rail", "subway", "tram")

const Railways = group("Railways", [
  s.Railway
    .apply({ ...roadsLayer, filter: railwayTransit })
    .renameIds((id) => id.replace("railway", "railway-transit")),
  s.Railway.apply({ ...roadsLayer, filter: f.line().notTunnel().kind("rail") }),
], { sources })

const Aeroways = group("Aeroways", [
  s.AerowayArea.apply({ ...landuse, filter: f.polygon().kind("aerodrome") }),
  s.AerowayTaxiway.apply({ ...roadsLayer, filter: f.line().kind("aeroway").kindDetail("taxiway") }),
  s.AerowayRunway.apply({ ...roadsLayer, filter: f.line().kind("aeroway").kindDetail("runway") }),
], { sources })

// Landuse polygons re-used as landcover, kept under their landuse ids.
const landusePedestrian = s.BridgePlatform
  .apply({ ...landuse, filter: f.polygon().kind("pedestrian") })
  .renameIds({ bridge_platform: "landuse_pedestrian" })

export const Roads = group("Roads", [
  landusePedestrian,
  s.Path.apply({ ...roadsLayer, filter: f.line().kind("path") }),
  Aeroways,
  Tunnels,
  SurfaceRoads,
  Railways,
], { sources })

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
  .renameIds({ landcover_grass: "landuse_grass" })

const landuseWood = s.LandcoverWood
  .apply({ ...landuse, filter: f.polygon().kind("wood", "forest") })
  .renameIds({ landcover_wood: "landuse_wood" })

export const Landcover = group("Landcover", [
  s.LanduseResidential.apply({ ...landuse, filter: f.polygon().kind("residential") }),
  s.LandcoverIce.apply({ ...landcoverLayer, filter: f.kind("glacier") }),
  s.LandcoverGrass.apply({ ...landcoverLayer, filter: f.kind("grassland") }),
  landuseGrass,
  landuseWood,
], { sources })

export const Water = group("Water", [
  s.Waterway.apply({ ...waterLayer, filter: f.line().kind(...waterwayKinds) }),
  s.Water.apply({ ...waterLayer, filter: f.polygon().kind("water", "lake", "reservoir", "dock") }),
  s.Ocean.apply({ ...waterLayer, filter: f.kind(...oceanKinds) }),
], { sources })

export const Buildings = group("Buildings", [
  s.Building.apply({
    ...pm,
    sourceLayer: "buildings",
    filter: f.kind("building", "building_part"),
  }),
], { sources })

export const Bridges = group("Bridges", [
  s.BridgeWaterway.apply({
    ...waterLayer,
    filter: f.line().has("bridge").kind(...waterwayKinds),
  }),
], { sources })

export const Boundaries = group("Boundaries", [
  s.BoundaryState.apply({ ...boundariesLayer, filter: f.line().kind("region") }),
  s.BoundaryCountry.apply({ ...boundariesLayer, filter: f.line().kind("country") }),
], { sources })

const WaterLabels = group("WaterLabels", [
  s.WaterNameLineMajor.apply({ ...waterLayer, filter: f.line().kind("river") }),
  s.WaterNameLineMinor.apply({ ...waterLayer, filter: f.line().kind("canal") }),
  s.WaterName.apply({ ...waterLayer, filter: f.point() }),
], { sources })

const HighwayLabels = group("HighwayLabels", [
  s.HighwayNameOther.apply({ ...roadsLayer, filter: f.line().kindNot("highway") }),
  s.HighwayNameMotorway.apply({ ...roadsLayer, filter: f.line().kind("highway") }),
], { sources })

const PlaceLabels = group("PlaceLabels", [
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
], { sources })

export const Labels = group("Labels", [WaterLabels, HighwayLabels, PlaceLabels], {
  sources,
  theme: { textField: ["name:en", "name"] },
})

export const Protomaps = group("Protomaps", [
  s.Background.apply(),
  Landcover,
  Water,
  Roads,
  Buildings,
  Bridges,
  Boundaries,
  Labels,
], {
  sources,
  document: {
    name: "Graphics (Protomaps)",
    metadata: {
      copyright:
        "Basemap data © OpenStreetMap contributors, served via Protomaps. Positron design derived from 'CartoDB Basemaps' designed by Stamen and Paul Norman for CartoDB Inc., licensed under CC-BY 3.0.",
    },
  }
})
