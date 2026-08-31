import { f, any } from "../../filter/openmaptiles.js"
import * as t from "../../templates/index.js"

const omt = { source: "openmaptiles" }
const landuse = { ...omt, sourceLayer: "landuse" }
const landcoverLayer = { ...omt, sourceLayer: "landcover" }
const terrain = { source: "terrain", sourceLayer: "relief" }
const waterway = { ...omt, sourceLayer: "waterway" }
const waterLayer = { ...omt, sourceLayer: "water" }
const transportation = { ...omt, sourceLayer: "transportation" }
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
// it under. A style applied twice appears under two keys (Railway / RailwayTransit)
// but keeps its root iml.style, so refinement still treats them as one style.
export const styles = {
  Background: t.Background.apply(),

  LanduseResidential: t.LanduseResidential.apply({ ...landuse, filter: f.polygon().cls("residential") }),
  LandcoverIce: t.LandcoverIce.apply({ ...landcoverLayer, filter: f.cls("ice") }),
  LandcoverGrass: t.LandcoverGrass.apply({ ...landcoverLayer, filter: f.cls("grass") }),
  LandcoverWood: t.LandcoverWood.apply({ ...landcoverLayer, filter: f.cls("wood") }),

  Mountains1: t.Mountains1.apply({ ...terrain, filter: f.is("shadow", 1) }),
  Mountains2: t.Mountains2.apply({ ...terrain, filter: f.is("shadow", 2) }),
  Mountains3: t.Mountains3.apply({
    ...terrain,
    filter: f.is("shadow", 3).isNot("source_id", 2598, 4847, 4851),
  }),
  Mountains4: t.Mountains4.apply({ ...terrain, filter: f.is("shadow", 4).isNot("source_id", 4848, 4852) }),
  Mountains5: t.Mountains5.apply({ ...terrain, filter: f.is("shadow", 5).isNot("source_id", 4849) }),
  Mountains6: t.Mountains6.apply({ ...terrain, filter: f.is("shadow", 6) }),

  Waterway: t.Waterway.apply({ ...waterway, filter: f.line() }),
  Water: t.Water.apply({ ...waterLayer, filter: f.polygon().clsNot("swimming_pool") }),
  Ocean: t.Ocean.apply({ ...waterLayer, filter: f.cls("ocean") }),

  BridgePlatform: t.BridgePlatform.apply({ ...transportation, filter: f.polygon().cls("bridge") }),

  TunnelMinor: t.TunnelMinor.apply({
    ...transportation,
    filter: f.line().tunnel().cls("minor", "minor_construction"),
  }),
  TunnelMajor: t.TunnelMajor.apply({ ...transportation, filter: majorTunnel }),
  TunnelMotorway: t.TunnelMotorway.apply({
    ...transportation,
    filter: f.line().tunnel().cls("motorway", "motorway_construction"),
  }),

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
    filter: f.line().notTunnel().cls("secondary", "secondary_construction", "tertiary", "tertiary_construction"),
  }),
  RoadPrimary: t.RoadPrimary.apply({
    ...transportation,
    filter: f.line().notTunnel().cls("primary", "primary_construction"),
  }),
  RoadTrunk: t.RoadTrunk.apply({ ...transportation, filter: f.line().notTunnel().where(trunkOrUsState) }),
  MotorwayRamp: t.MotorwayRamp.apply({
    ...transportation,
    filter: f.line().notTunnel().cls("motorway", "motorway_construction").ramp(),
  }),
  Motorway: t.Motorway.apply({
    ...transportation,
    filter: f.line().notTunnel().cls("motorway", "motorway_construction").notRamp(),
  }),

  Railway: t.Railway.apply({ ...transportation, filter: f.cls("rail").notTunnel() }),
  RailwayTransit: t.Railway
    .apply({ ...transportation, filter: f.cls("transit").notTunnel() })
    .patch((layer) => ({ ...layer, id: layer.id.replace("railway", "railway-transit") })),

  Building: t.Building.apply({
    ...omt,
    sourceLayer: "building",
    filter: any(f.gte("layer", 0), f.hasNot("layer")),
  }),

  BridgeWaterway: t.BridgeWaterway.apply({ ...waterway, filter: f.line().bridge() }),

  BoundaryCountry: t.BoundaryCountry.apply({
    ...omt,
    sourceLayer: "boundary",
    filter: f.is("admin_level", 2).is("maritime", 0),
  }),

  WaterNameLineMinor: t.WaterNameLineMinor.apply({ ...waterway, filter: f.line().notTunnel().clsNot("stream") }),
  WaterNameLineMajor: t.WaterNameLineMajor.apply({ ...omt, sourceLayer: "water_name", filter: f.line() }),
  WaterName: t.WaterName.apply({ ...omt, sourceLayer: "water_name", filter: f.point().clsNot("lake", "bay") }),

  HighwayNameOther: t.HighwayNameOther.apply({
    ...transportationName,
    filter: f.line().cls("trunk", "primary", "secondary"),
  }),
  HighwayNameMotorway: t.HighwayNameMotorway.apply({
    ...transportationName,
    filter: f.line().cls("motorway", "motorway_construction"),
  }),

  PlaceOther: t.PlaceOther.apply({
    ...place,
    filter: f.point().clsNot("city", "suburb", "town", "village", "province", "country", "state", "continent"),
  }),
  PlaceSuburb: t.PlaceSuburb.apply({ ...place, filter: f.point().cls("suburb").lte("rank", 16) }),
  PlaceVillage: t.PlaceVillage.apply({ ...place, filter: f.point().cls("village") }),
  PlaceTown: t.PlaceTown.apply({ ...place, filter: f.point().cls("town").lte("rank", 13) }),
  PlaceCity: t.PlaceCity.apply({
    ...place,
    filter: f
      .point()
      .cls("city")
      .isNot("capital", 2)
      .gte("rank", 4)
      .isNot("name", "City of Westminster", "City of London"),
  }),
  PlaceCityLarge: t.PlaceCityLarge.apply({
    ...place,
    filter: f.point().isNot("capital", 2).lte("rank", 3).cls("city"),
  }),
  PlaceCapital: t.PlaceCapital.apply({ ...place, filter: f.point().is("capital", 2).cls("city") }),
  PlaceState: t.PlaceState.apply({ ...place, filter: f.point().cls("state").lte("rank", 1) }),
  PlaceCountryMinor: t.PlaceCountryMinor.apply({ ...place, filter: f.point().cls("country").gte("rank", 2) }),
  PlaceCountryMajor: t.PlaceCountryMajor.apply({ ...place, filter: f.point().lte("rank", 1).cls("country") }),
}
