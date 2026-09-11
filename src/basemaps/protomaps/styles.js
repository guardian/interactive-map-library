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
// (LandGrassPark) but keeps its root iml.style, so refinement treats them as one.
export const styles = {
  Background: t.Background.apply(),

  LandResidential: t.LandResidential.apply({
    ...landuse,
    filter: f.polygon().kind("residential"),
  }),
  LandIce: t.LandIce.apply({ ...landcoverLayer, filter: f.kind("glacier") }),
  LandGrass: t.LandGrass.apply({ ...landcoverLayer, filter: f.kind("grassland") }),
  LandGrassPark: t.LandGrass.apply({
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
  }).patch({ land_grass: { id: "land_grass_park" } }),
  LandWood: t.LandWood.apply({
    ...landuse,
    filter: f.polygon().kind("wood", "forest"),
  }),

  WaterWaterway: t.WaterWaterway.apply({ ...waterLayer, filter: f.line().kind(...waterwayKinds) }),

  WaterBody: t.WaterBody.apply({
    ...waterLayer,
    filter: f.polygon().kind("water", "lake", "reservoir", "dock"),
  }),

  WaterOcean: t.WaterOcean.apply({ ...waterLayer, filter: f.kind(...oceanKinds) }),

  LandPedestrian: t.LandPedestrian.apply({
    ...landuse,
    filter: f.polygon().kind("pedestrian"),
  }),
  RoadPath: t.RoadPath.apply({ ...roadsLayer, filter: f.line().kind("path") }),

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
  RoadMotorwayRamp: t.RoadMotorwayRamp.apply({
    ...roadsLayer,
    filter: f.line().notTunnel().kind("highway", "major_road").ramp(),
  }),

  RoadMotorway: t.RoadMotorway.apply({
    ...roadsLayer,
    filter: f.line().notTunnel().kind("highway").notRamp(),
  }),

  RailTransit: t.Rail.apply({ ...roadsLayer, filter: railwayTransit }).patch((layer) => ({
    ...layer,
    id: layer.id.replace("rail_line", "rail_transit_line"),
  })),
  Rail: t.Rail.apply({ ...roadsLayer, filter: f.line().notTunnel().kind("rail") }),

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

  LabelWaterLineMajor: t.LabelWaterLineMajor.apply({
    ...waterLayer,
    filter: f.line().kind("river"),
  }),
  LabelWaterLineMinor: t.LabelWaterLineMinor.apply({
    ...waterLayer,
    filter: f.line().kind("canal"),
  }),
  LabelWaterPoint: t.LabelWaterPoint.apply({ ...waterLayer, filter: f.point() }),

  LabelRoadOther: t.LabelRoadOther.apply({
    ...roadsLayer,
    filter: f.line().kindNot("highway"),
  }),
  LabelRoadMotorway: t.LabelRoadMotorway.apply({
    ...roadsLayer,
    filter: f.line().kind("highway"),
  }),

  LabelPlaceSuburb: t.LabelPlaceSuburb.apply({ ...places, filter: f.point().kindDetail("suburb") }),
  LabelPlaceOther: t.LabelPlaceOther.apply({
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
  LabelPlaceVillage: t.LabelPlaceVillage.apply({
    ...places,
    filter: f.point().kind("locality").kindDetail("village", "hamlet"),
  }),

  LabelPlaceTown: t.LabelPlaceTown.apply({
    ...places,
    filter: f.point().kind("locality").kindDetail("town"),
  }),

  LabelPlaceCityMinor: t.LabelPlaceCityMinor.apply({
    ...places,
    filter: f
      .point()
      .kind("locality")
      .kindDetail("city")
      .isNot("capital", "yes")
      .isNot("name", "City of Westminster", "City of London"),
  }),

  LabelPlaceCapital: t.LabelPlaceCapital.apply({
    ...places,
    filter: f.point().kind("locality").is("capital", "yes"),
  }),
  LabelPlaceCityMajor: t.LabelPlaceCityMajor.apply({
    ...places,
    filter: f.point().kind("locality").kindDetail("city").isNot("capital", "yes").minZoomLte(4),
  }),
  LabelPlaceState: t.LabelPlaceState.apply({ ...places, filter: f.point().kind("region") }),
  LabelPlaceCountryMinor: t.LabelPlaceCountryMinor.apply({
    ...places,
    filter: f.point().kind("country").minZoomGte(4),
  }),
  LabelPlaceCountryMajor: t.LabelPlaceCountryMajor.apply({
    ...places,
    filter: f.point().kind("country").minZoomLte(3),
  }),
}
