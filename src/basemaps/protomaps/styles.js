import { f, any } from "../../filter/protomaps.js"
import * as t from "../../templates/index.js"

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

const railwayTransit = f
  .line()
  .notTunnel()
  .kind("rail")
  .kindDetail("transit", "light_rail", "subway", "tram")

// The bound styles this basemap composes, each keyed by the name consumers import
// it under. A style reused under a fresh id namespace appears under a second key
// (LanduseGrass) but keeps its root iml.style, so refinement treats them as one.
export const styles = {
  Background: t.Background.apply(),

  LanduseResidential: t.LanduseResidential.apply({
    ...landuse,
    filter: f.polygon().kind("residential"),
  }),
  LandcoverIce: t.LandcoverIce.apply({ ...landcoverLayer, filter: f.kind("glacier") }),
  LandcoverGrass: t.LandcoverGrass.apply({ ...landcoverLayer, filter: f.kind("grassland") }),
  LanduseGrass: t.LandcoverGrass.apply({
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
  }).patch({ landcover_grass: { id: "landuse_grass" } }),
  LanduseWood: t.LandcoverWood.apply({
    ...landuse,
    filter: f.polygon().kind("wood", "forest"),
  }).patch({ landcover_wood: { id: "landuse_wood" } }),

  Waterway: t.Waterway.apply({ ...waterLayer, filter: f.line().kind(...waterwayKinds) }),
  Water: t.Water.apply({
    ...waterLayer,
    filter: f.polygon().kind("water", "lake", "reservoir", "dock"),
  }),
  Ocean: t.Ocean.apply({ ...waterLayer, filter: f.kind(...oceanKinds) }),

  // Landuse polygon re-used as a road platform, kept under its landuse id.
  LandusePedestrian: t.BridgePlatform.apply({
    ...landuse,
    filter: f.polygon().kind("pedestrian"),
  }).patch({ bridge_platform: { id: "landuse_pedestrian" } }),
  Path: t.Path.apply({ ...roadsLayer, filter: f.line().kind("path") }),

  AerowayArea: t.AerowayArea.apply({ ...landuse, filter: f.polygon().kind("aerodrome") }),
  AerowayTaxiway: t.AerowayTaxiway.apply({
    ...roadsLayer,
    filter: f.line().kind("aeroway").kindDetail("taxiway"),
  }),
  AerowayRunway: t.AerowayRunway.apply({
    ...roadsLayer,
    filter: f.line().kind("aeroway").kindDetail("runway"),
  }),

  TunnelMinor: t.TunnelMinor.apply({ ...roadsLayer, filter: f.line().tunnel().kind("minor_road") }),
  TunnelMajor: t.TunnelMajor.apply({ ...roadsLayer, filter: f.line().tunnel().kind("major_road") }),
  TunnelMotorway: t.TunnelMotorway.apply({
    ...roadsLayer,
    filter: f.line().tunnel().kind("highway"),
  }),

  RoadService: t.RoadService.apply({
    ...roadsLayer,
    filter: f.line().notTunnel().kind("minor_road").kindDetail("service"),
  }),
  RoadMinor: t.RoadMinor.apply({
    ...roadsLayer,
    filter: f.line().notTunnel().kind("minor_road").kindDetailNot("service"),
  }),
  RoadSecondaryTertiary: t.RoadSecondaryTertiary.apply({
    ...roadsLayer,
    filter: f.line().notTunnel().kind("major_road").kindDetail("secondary", "tertiary"),
  }),
  RoadPrimary: t.RoadPrimary.apply({
    ...roadsLayer,
    filter: f.line().notTunnel().kindDetail("primary"),
  }),
  RoadTrunk: t.RoadTrunk.apply({ ...roadsLayer, filter: f.line().notTunnel().kindDetail("trunk") }),
  MotorwayRamp: t.MotorwayRamp.apply({
    ...roadsLayer,
    filter: f.line().notTunnel().kind("highway", "major_road").ramp(),
  }),

  Motorway: t.Motorway.apply({
    ...roadsLayer,
    filter: f.line().notTunnel().kind("highway").notRamp(),
  }),

  RailwayTransit: t.Railway.apply({ ...roadsLayer, filter: railwayTransit }).patch((layer) => ({
    ...layer,
    id: layer.id.replace("railway", "railway-transit"),
  })),
  Railway: t.Railway.apply({ ...roadsLayer, filter: f.line().notTunnel().kind("rail") }),

  Building: t.Building.apply({
    ...pm,
    sourceLayer: "buildings",
    filter: f.kind("building", "building_part"),
  }),

  BridgeWaterway: t.BridgeWaterway.apply({
    ...waterLayer,
    filter: f
      .line()
      .has("bridge")
      .kind(...waterwayKinds),
  }),

  BoundaryState: t.BoundaryState.apply({ ...boundariesLayer, filter: f.line().kind("region") }),
  BoundaryCountry: t.BoundaryCountry.apply({
    ...boundariesLayer,
    filter: f.line().kind("country"),
  }),

  WaterNameLineMajor: t.WaterNameLineMajor.apply({ ...waterLayer, filter: f.line().kind("river") }),
  WaterNameLineMinor: t.WaterNameLineMinor.apply({ ...waterLayer, filter: f.line().kind("canal") }),
  WaterName: t.WaterName.apply({ ...waterLayer, filter: f.point() }),

  HighwayNameOther: t.HighwayNameOther.apply({
    ...roadsLayer,
    filter: f.line().kindNot("highway"),
  }),
  HighwayNameMotorway: t.HighwayNameMotorway.apply({
    ...roadsLayer,
    filter: f.line().kind("highway"),
  }),

  PlaceSuburb: t.PlaceSuburb.apply({ ...places, filter: f.point().kindDetail("suburb") }),
  PlaceOther: t.PlaceOther.apply({
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
  PlaceVillage: t.PlaceVillage.apply({
    ...places,
    filter: f.point().kind("locality").kindDetail("village", "hamlet"),
  }),
  PlaceTown: t.PlaceTown.apply({
    ...places,
    filter: f.point().kind("locality").kindDetail("town"),
  }),
  PlaceCity: t.PlaceCity.apply({
    ...places,
    filter: f
      .point()
      .kind("locality")
      .kindDetail("city")
      .isNot("capital", "yes")
      .isNot("name", "City of Westminster", "City of London"),
  }),
  PlaceCapital: t.PlaceCapital.apply({
    ...places,
    filter: f.point().kind("locality").is("capital", "yes"),
  }),
  PlaceCityLarge: t.PlaceCityLarge.apply({
    ...places,
    filter: f.point().kind("locality").kindDetail("city").isNot("capital", "yes").minZoomLte(4),
  }),
  PlaceState: t.PlaceState.apply({ ...places, filter: f.point().kind("region") }),
  PlaceCountryMinor: t.PlaceCountryMinor.apply({
    ...places,
    filter: f.point().kind("country").minZoomGte(4),
  }),
  PlaceCountryMajor: t.PlaceCountryMajor.apply({
    ...places,
    filter: f.point().kind("country").minZoomLte(3),
  }),
}
