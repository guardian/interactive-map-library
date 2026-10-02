import { f } from "../../filter/openmaptiles.js"

/**
 * Maps this basemap's layer ids onto the ids in Datawrapper's original map style
 * (`app/res/graphics-map-style.json`).
 */
export const DATAWRAPPER_IDS = {
  background: "background",

  land_residential: "landuse_residential",
  land_ice: "landcover_ice",
  land_grass: "landcover_grass",
  land_park: "park",
  land_wood: "landcover_wood",

  terrain_mountain_1: "mountains_1",
  terrain_mountain_2: "mountains_2",
  terrain_mountain_3: "mountains_3",
  terrain_mountain_4: "mountains_4",
  terrain_mountain_5: "mountains_5",
  terrain_mountain_6: "mountains_6",

  water_waterway: "waterway",
  water_body_outline: "water-outline",
  water_body: "water",
  water_ocean_outline: "ocean-outline",
  water_ocean: "ocean",

  road_path: "road_path",

  aeroway_area: "aeroway-area",
  aeroway_taxiway: "aeroway-taxiway",
  aeroway_runway: "aeroway-runway",

  tunnel_minor: "tunnel_minor",
  tunnel_major: "tunnel_major",
  tunnel_motorway: "tunnel_motorway",

  // They fold service roads into road_minor-casing.
  road_service_casing: "road_service_casing",
  road_minor_casing: "road_minor-casing",
  road_secondary_tertiary_casing: "road_secondary_tertiary-casing",

  // They have road_primary but no casing for it
  road_primary_casing: "road_primary_casing",
  road_trunk_casing: "road_trunk-casing",
  road_motorway_ramp_casing: "road_major_motorway_ramp-casing",
  road_motorway_casing: "road_major_motorway-casing",

  road_minor: "road_minor",
  road_secondary_tertiary: "road_secondary_tertiary",
  road_primary: "road_primary",
  road_trunk: "road_trunk",
  road_motorway_ramp: "road_major_motorway_ramp",
  road_motorway: "road_major_motorway",

  // HACK: Datawrapper has two identical layers for railways: "railway" and "railway-transit". In
  // our style templates, we draw railways with a dash layer on top (to give the impression of
  // sleepers), which Datawrapper doesn't do... so we sneak this dash layer in with the name
  // "railway-transit".
  rail_line_dash: "railway-transit",
  rail_line: "railway",

  building: "building",

  bridge_waterway_casing: "waterway-bridge-case",
  bridge_waterway: "waterway-bridge",

  boundary_state: "boundary_state",

  // We split disputed boundaries out of their boundary_country
  boundary_disputed: "boundary_disputed",
  boundary_country: "boundary_country",

  label_water_point: "water_name",

  label_road_other: "highway_name_other",
  label_road_motorway: "highway_name_motorway",

  label_place_other: "place_other",
  label_place_suburb: "place_suburb",
  label_place_village: "place_village",
  label_place_town: "place_town",
  label_place_city_minor: "place_label_city",
  label_place_city_major: "place_city_large",
  label_place_capital: "place_capital",
  label_place_state: "place_state",
  label_place_country_minor: "place_country_other",
  label_place_country_major: "place_country_major",

  building_3d: "building3d",
}

const minorBridge = f.line().bridge().cls("minor_road", "minor", "minor_construction")

const majorBridge = f
  .line()
  .bridge()
  .cls(
    "primary",
    "primary_construction",
    "secondary",
    "secondary_construction",
    "tertiary",
    "tertiary_construction",
    "trunk",
  )

const hiddenLine = (id, filter) => ({
  id,
  type: "line",
  source: "openmaptiles",
  "source-layer": "transportation",
  filter: filter.compile(),
  layout: { visibility: "none" },
})

const hiddenBridgeLayers = [
  hiddenLine("bridge_minor case", minorBridge),
  hiddenLine("bridge_major_casing", majorBridge),
  hiddenLine("bridge_minor", minorBridge),
  hiddenLine("bridge_major", majorBridge),
]

const hiddenRoadPathCasing = hiddenLine(
  "road_path-casing",
  f.line().cls("path", "path_construction", "track", "track_construction"),
)
/**
 * Tweaks the Graphics basemap layers to meet Datawrapper's expected structure.
 *
 * The Graphics basemap styles the maps created in Datawrapper's map-maker tool.
 * As such, Datawrapper have strict requirements about the layers the style can
 * contain. We have to sacrifice a few of the intended visual and structural aspects
 * of our style to meet these requirements.
 *
 * @param {import("../../core/style.js").ResolvedLayer[]} layers
 */
export function adaptForDatawrapper(layers) {
  const unused = new Set(Object.keys(DATAWRAPPER_IDS))
  const unmapped = []

  const adapted = layers.flatMap((layer) => {
    if (!(layer.id in DATAWRAPPER_IDS)) {
      unmapped.push(layer.id)
      return [stripProvenance(layer)]
    }

    unused.delete(layer.id)

    const target = DATAWRAPPER_IDS[layer.id]
    const renamed = stripProvenance({ ...layer, id: target })

    if (target === "waterway-bridge") {
      // Slot the unused-but-required bridge layers in with the other bridge layers
      return [renamed, ...hiddenBridgeLayers]
    }

    if (target === "road_path") {
      return [hiddenRoadPathCasing, renamed]
    }

    return [renamed]
  })

  if (unmapped.length > 0 || unused.size > 0) {
    throw new Error(
      [
        "Datawrapper id mapping is out of date.",
        unmapped.length > 0 && `  layers with no mapping: ${unmapped.join(", ")}`,
        unused.size > 0 && `  mappings matching no layer: ${[...unused].join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
  }

  return adapted
}

/**
 * @param {import("../../core/style.js").ResolvedLayer} layer
 */
function stripProvenance({ metadata, ...layer }) {
  const { iml, ...rest } = metadata ?? {}

  if (Object.keys(rest).length === 0) {
    return layer
  }

  return { ...layer, metadata: rest }
}
