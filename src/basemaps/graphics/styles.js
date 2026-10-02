import { f, any } from "../../filter/openmaptiles.js"
import * as t from "../../templates/index.js"

const omt = { source: "openmaptiles" }
const landuse = { ...omt, sourceLayer: "landuse" }
const landcoverLayer = { ...omt, sourceLayer: "landcover" }
const terrain = { source: "terrain", sourceLayer: "relief" }
const waterway = { ...omt, sourceLayer: "waterway" }
const waterLayer = { ...omt, sourceLayer: "water" }
const transportation = { ...omt, sourceLayer: "transportation" }
const aeroway = { ...omt, sourceLayer: "aeroway" }
const transportationName = { ...omt, sourceLayer: "transportation_name" }
const place = { ...omt, sourceLayer: "place" }

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

// The bound styles this basemap composes, each keyed by the name consumers import
// it under. A style applied twice appears under two keys (Rail / RailTransit)
// but keeps its root iml.style, so refinement still treats them as one style.
export const styles = {
  Background: t.Background.apply(),

  LandResidential: t.LandResidential.apply({
    ...landuse,
    filter: f.polygon().cls("residential"),
  }),
  LandIce: t.LandIce.apply({ ...landcoverLayer, filter: f.cls("ice") }),
  LandGrass: t.LandGrass.apply({
    ...landcoverLayer,
    filter: f.cls("grass").isNot("subclass", "scrub"),
  }),
  LandPark: t.LandPark.apply({ ...omt, sourceLayer: "park" }).patchAll({
    // Datawrapper requires the presence of this layer, but we don't want it,
    // so make it invisible
    layout: { visibility: "none" },
  }),
  LandWood: t.LandWood.apply({ ...landcoverLayer, filter: f.cls("wood") }),

  TerrainMountain1: t.TerrainMountain1.apply({ ...terrain, filter: f.is("shadow", 1) }),
  TerrainMountain2: t.TerrainMountain2.apply({ ...terrain, filter: f.is("shadow", 2) }),
  TerrainMountain3: t.TerrainMountain3.apply({
    ...terrain,
    filter: f.is("shadow", 3).isNot("source_id", 2598, 4847, 4851),
  }),
  TerrainMountain4: t.TerrainMountain4.apply({
    ...terrain,
    filter: f.is("shadow", 4).isNot("source_id", 4848, 4852),
  }),
  TerrainMountain5: t.TerrainMountain5.apply({
    ...terrain,
    filter: f.is("shadow", 5).isNot("source_id", 4849),
  }),
  TerrainMountain6: t.TerrainMountain6.apply({ ...terrain, filter: f.is("shadow", 6) }),

  WaterWaterway: t.WaterWaterway.apply({ ...waterway, filter: f.line() }),
  WaterBody: t.WaterBody.apply({ ...waterLayer, filter: f.polygon().clsNot("swimming_pool") }),
  WaterOcean: t.WaterOcean.apply({ ...waterLayer, filter: f.cls("ocean") }),

  LandPedestrian: t.LandPedestrian.apply({ ...transportation, filter: f.polygon().cls("bridge") }),

  RoadPath: t.RoadPath.apply({
    ...transportation,
    filter: f.line().cls("path", "path_construction", "track", "track_construction"),
  }),

  TunnelMinor: t.TunnelMinor.apply({
    ...transportation,
    filter: f.line().tunnel().cls("minor", "minor_construction"),
  }),
  TunnelMajor: t.TunnelMajor.apply({ ...transportation, filter: majorTunnel }),
  TunnelMotorway: t.TunnelMotorway.apply({
    ...transportation,
    filter: f.line().tunnel().cls("motorway", "motorway_construction"),
  }),

  AerowayArea: t.AerowayArea.apply({ ...aeroway, filter: f.polygon().cls("aerodrome") }),
  AerowayTaxiway: t.AerowayTaxiway.apply({ ...aeroway, filter: f.line().cls("taxiway") }),
  AerowayRunway: t.AerowayRunway.apply({ ...aeroway, filter: f.line().cls("runway") }),

  RoadService: t.RoadService.apply({
    ...transportation,
    filter: f.line().notTunnel().cls("service", "service_construction"),
  }),
  RoadMinor: t.RoadMinor.apply({
    ...transportation,
    filter: f.line().notTunnel().cls("minor", "minor_construction"),
  }),
  RoadSecondaryTertiary: t.RoadSecondaryTertiary.apply({
    ...transportation,
    filter: f
      .line()
      .notTunnel()
      .cls("secondary", "secondary_construction", "tertiary", "tertiary_construction"),
  }),
  RoadPrimary: t.RoadPrimary.apply({
    ...transportation,
    filter: f.line().notTunnel().cls("primary", "primary_construction"),
  }),
  RoadTrunk: t.RoadTrunk.apply({
    ...transportation,
    filter: f.line().notTunnel().where(trunkOrUsState),
  }),
  RoadMotorwayRamp: t.RoadMotorwayRamp.apply({
    ...transportation,
    filter: f.line().notTunnel().cls("motorway", "motorway_construction").ramp(),
  }),
  RoadMotorway: t.RoadMotorway.apply({
    ...transportation,
    filter: f.line().notTunnel().cls("motorway", "motorway_construction").notRamp(),
  }),

  Rail: t.Rail.apply({ ...transportation, filter: f.cls("rail").notTunnel() }),
  RailTransit: t.Rail.apply({
    ...transportation,
    filter: f.cls("transit").notTunnel(),
  }).patch((layer) => ({ ...layer, id: layer.id.replace("rail_line", "rail_transit_line") })),

  Building: t.Building.apply({
    ...omt,
    sourceLayer: "building",
    filter: any(f.gte("layer", 0), f.hasNot("layer")),
  }),

  BridgeWaterway: t.BridgeWaterway.apply({ ...waterway, filter: f.line().bridge() }),

  BoundaryState: t.BoundaryState.apply({
    ...omt,
    sourceLayer: "boundary",
    filter: f.is("admin_level", 4).is("maritime", 0),
  }),

  BoundaryCountry: t.BoundaryCountry.apply({
    ...omt,
    sourceLayer: "boundary",
    filter: f.is("admin_level", 2).is("maritime", 0).isNot("disputed", 1),
  }),

  BoundaryDisputed: t.BoundaryDisputed.apply({
    ...omt,
    sourceLayer: "boundary",
    filter: f.is("admin_level", 2).is("maritime", 0).is("disputed", 1),
  }),

  LabelWaterLineMinor: t.LabelWaterLineMinor.apply({
    ...waterway,
    filter: f.line().notTunnel().clsNot("stream"),
  }),
  LabelWaterLineMajor: t.LabelWaterLineMajor.apply({
    ...omt,
    sourceLayer: "water_name",
    filter: f.line(),
  }),
  LabelWaterPoint: t.LabelWaterPoint.apply({
    ...omt,
    sourceLayer: "water_name",
    filter: f.point().clsNot("lake", "bay"),
  }),

  LabelRoadOther: t.LabelRoadOther.apply({
    ...transportationName,
    filter: f.line().cls("trunk", "primary", "secondary"),
  }),
  LabelRoadMotorway: t.LabelRoadMotorway.apply({
    ...transportationName,
    filter: f.line().cls("motorway", "motorway_construction"),
  }),

  LabelPlaceOther: t.LabelPlaceOther.apply({
    ...place,
    filter: f
      .point()
      .clsNot("city", "suburb", "town", "village", "province", "country", "state", "continent"),
  }),
  LabelPlaceSuburb: t.LabelPlaceSuburb.apply({
    ...place,
    filter: f.point().cls("suburb").lte("rank", 16),
  }),
  LabelPlaceVillage: t.LabelPlaceVillage.apply({ ...place, filter: f.point().cls("village") }),
  LabelPlaceTown: t.LabelPlaceTown.apply({
    ...place,
    filter: f.point().cls("town").lte("rank", 13),
  }),
  LabelPlaceCityMinor: t.LabelPlaceCityMinor.apply({
    ...place,
    filter: f
      .point()
      .cls("city")
      .isNot("capital", 2)
      .gte("rank", 4)
      .isNot("name", "City of Westminster", "City of London"),
  }),
  LabelPlaceCityMajor: t.LabelPlaceCityMajor.apply({
    ...place,
    filter: f.point().isNot("capital", 2).lte("rank", 3).cls("city"),
  }),
  LabelPlaceCapital: t.LabelPlaceCapital.apply({
    ...place,
    filter: f.point().is("capital", 2).cls("city"),
  }),
  LabelPlaceState: t.LabelPlaceState.apply({
    ...place,
    filter: f.point().cls("state").lte("rank", 1),
  }),
  LabelPlaceCountryMinor: t.LabelPlaceCountryMinor.apply({
    ...place,
    filter: f.point().cls("country").gte("rank", 2),
  }),
  LabelPlaceCountryMajor: t.LabelPlaceCountryMajor.apply({
    ...place,
    filter: f.point().lte("rank", 1).cls("country"),
  }),
}
