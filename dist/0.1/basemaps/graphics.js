import { Stylesheet } from "../core/stylesheet.js"
import { f, any } from "../core/filter/openmaptiles.js"
import * as s from "../styles/index.js"

const { defaults, group, layer, build } = new Stylesheet({
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
})

layer(s.Background)

defaults({
  source: "openmaptiles",
  theme: { textField: ["name:en", "name_en", "name"] },
})

// Landuse & landcover -------------------------------------------------------

layer(s.LanduseResidential, {
  sourceLayer: "landuse",
  filter: f.polygon().cls("residential"),
})

group({ sourceLayer: "landcover" }).within((layer) => {
  layer(s.LandcoverIce, { filter: f.cls("ice") })
  layer(s.LandcoverGrass, { filter: f.cls("grass") })
  layer(s.LandcoverWood, { filter: f.cls("wood") })
})

// Relief --------------------------------------------------------------------

group({ source: "terrain", sourceLayer: "relief" }).within((layer) => {
  layer(s.Mountains1, { filter: f.is("shadow", 1) })
  layer(s.Mountains2, { filter: f.is("shadow", 2) })
  layer(s.Mountains3, { filter: f.is("shadow", 3).isNot("source_id", 2598, 4847, 4851) })
  layer(s.Mountains4, { filter: f.is("shadow", 4).isNot("source_id", 4848, 4852) })
  layer(s.Mountains5, { filter: f.is("shadow", 5).isNot("source_id", 4849) })
  layer(s.Mountains6, { filter: f.is("shadow", 6) })
})

// Water ---------------------------------------------------------------------

layer(s.Waterway, { sourceLayer: "waterway", filter: f.line() })

group({ sourceLayer: "water" }).within((layer) => {
  layer(s.WaterOutline, { filter: f.polygon().clsNot("swimming_pool") })
  layer(s.Water, { filter: f.polygon().clsNot("swimming_pool") })
  layer(s.Ocean, { filter: f.cls("ocean") })
})

// Roads ---------------------------------------------------------------------

const trunkOrUsState = any(f.cls("trunk", "trunk_construction"), f.is("network", "us-state"))

layer(s.BridgePlatform, { sourceLayer: "transportation", filter: f.polygon().cls("bridge") })

// NOTE: these are invisible in the graphics style reference
// const aeroway = group({ sourceLayer: "aeroway" });
// aeroway(AerowayArea, { filter: f.polygon().cls("runway", "taxiway") });
// aeroway(AerowayTaxiway, { filter: f.line().cls("taxiway") });
// aeroway(AerowayRunway, { filter: f.line().cls("runway") });

group({ sourceLayer: "transportation" }).within((layer) => {
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

  layer(s.TunnelMinorCasing, { filter: f.line().tunnel().cls("minor", "minor_construction") })
  layer(s.TunnelMinor, { filter: f.line().tunnel().cls("minor", "minor_construction") })
  layer(s.TunnelMajorCasing, { filter: majorTunnel })
  layer(s.TunnelMajor, { filter: majorTunnel })
  layer(s.TunnelMotorwayCasing, {
    filter: f.line().tunnel().cls("motorway", "motorway_construction"),
  })
  layer(s.TunnelMotorway, {
    filter: f.line().tunnel().cls("motorway", "motorway_construction"),
  })

  layer(s.RoadMinorCasing, { filter: f.line().notTunnel().cls("minor", "minor_construction") })
  layer(s.RoadService, { filter: f.line().notTunnel().cls("service", "service_construction") })
  layer(s.RoadSecondaryTertiaryCasing, {
    filter: f
      .line()
      .notTunnel()
      .cls("secondary", "secondary_construction", "tertiary", "tertiary_construction"),
  })
  layer(s.RoadTrunkCasing, { filter: f.line().notTunnel().where(trunkOrUsState) })
  layer(s.MotorwayRampCasing, {
    filter: f.line().notTunnel().cls("motorway", "motorway_construction").ramp(),
  })
  layer(s.MotorwayCasing, {
    filter: f.line().notTunnel().cls("motorway", "motorway_construction").notRamp(),
  })

  // Surface roads exclude tunnels; each tunnel is drawn once by its dedicated
  // tunnel layer above, beneath every road.
  layer(s.RoadMinor, { filter: f.line().notTunnel().cls("minor", "minor_construction") })
  layer(s.RoadSecondaryTertiary, {
    filter: f
      .line()
      .notTunnel()
      .cls("secondary", "secondary_construction", "tertiary", "tertiary_construction"),
  })
  layer(s.RoadPrimary, {
    filter: f.line().notTunnel().cls("primary", "primary_construction"),
  })
  layer(s.RoadTrunk, { filter: f.line().notTunnel().where(trunkOrUsState) })
  layer(s.MotorwayRamp, {
    filter: f.line().notTunnel().cls("motorway", "motorway_construction").ramp(),
  })
  layer(s.Motorway, {
    filter: f.line().notTunnel().cls("motorway", "motorway_construction").notRamp(),
  })

  layer(s.Railway, { id: "railway", filter: f.cls("rail").notTunnel() })
  layer(s.RailwayDash, { id: "railway-dash", filter: f.cls("rail").notTunnel() })

  layer(s.Railway, { id: "railway-transit", filter: f.cls("transit").notTunnel() })
  layer(s.RailwayDash, { id: "railway-transit-dash", filter: f.cls("transit").notTunnel() })
})

// Buildings -----------------------------------------------------------------

layer(s.Building, {
  sourceLayer: "building",
  filter: any(f.gte("layer", 0), f.hasNot("layer")),
})

// Bridges -------------------------------------------------------------------

group({ sourceLayer: "waterway" }).within((layer) => {
  layer(s.BridgeWaterwayCasing, { filter: f.line().bridge() })
  layer(s.BridgeWaterway, { filter: f.line().bridge() })
})

// Boundaries ----------------------------------------------------------------

group({ sourceLayer: "boundary" }).within((layer) => {
  // NOTE: Datawrapper lets us add/remove this specifically
  // layer(s.BoundaryState, { filter: f.is("admin_level", 4).isNot("maritime", 1) })
  layer(s.BoundaryCountry, { filter: f.is("admin_level", 2).is("maritime", 0) })
})

// Labels --------------------------------------------------------------------

layer(s.WaterNameLineMinor, {
  sourceLayer: "waterway",
  filter: f.line().notTunnel().clsNot("stream"),
})

layer(s.WaterNameLineMajor, { sourceLayer: "water_name", filter: f.line() })

layer(s.WaterName, {
  sourceLayer: "water_name",
  filter: f.point().clsNot("lake", "bay"),
})

group({ sourceLayer: "transportation_name" }).within((layer) => {
  layer(s.HighwayNameOther, { filter: f.line().cls("trunk", "primary", "secondary") })
  layer(s.HighwayNameMotorway, { filter: f.line().cls("motorway", "motorway_construction") })
})

group({ sourceLayer: "place", filter: f.point() }).within((layer) => {
  layer(s.PlaceOther, {
    filter: f.clsNot(
      "city",
      "suburb",
      "town",
      "village",
      "province",
      "country",
      "state",
      "continent",
    ),
  })

  layer(s.PlaceSuburb, { filter: f.cls("suburb").lte("rank", 16) })
  layer(s.PlaceVillage, { filter: f.cls("village") })
  layer(s.PlaceTown, { filter: f.cls("town").lte("rank", 13) })

  layer(s.PlaceCity, {
    filter: f
      .cls("city")
      .isNot("capital", 2)
      .gte("rank", 4)
      .isNot("name", "City of Westminster", "City of London"),
  })

  layer(s.PlaceCityLarge, { filter: f.isNot("capital", 2).lte("rank", 3).cls("city") })
  layer(s.PlaceCapital, { filter: f.is("capital", 2).cls("city") })
  layer(s.PlaceState, { filter: f.cls("state").lte("rank", 1) })
  layer(s.PlaceCountryMinor, { filter: f.cls("country").gte("rank", 2) })
  layer(s.PlaceCountryMajor, { filter: f.lte("rank", 1).cls("country") })
})

export const graphics = build()
