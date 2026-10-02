/**
 * Maps this basemap's layer ids onto the ids in Datawrapper's original map style
 * (`app/res/graphics-map-style.json`).
 *
 * `null` marks a layer we introduced that has no counterpart in their document -
 * it keeps our id.
 */
export const DATAWRAPPER_IDS = {
  background: "background",

  land_residential: "landuse_residential",
  land_ice: "landcover_ice",
  land_grass: "landcover_grass",
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

  // Our replacement for their four bridge_* line layers
  land_pedestrian: null,

  aeroway_area: "aeroway-area",
  aeroway_taxiway: "aeroway-taxiway",
  aeroway_runway: "aeroway-runway",

  // They draw tunnels as a single dashed line; we add real casings
  tunnel_minor_casing: null,
  tunnel_minor: "tunnel_minor",
  tunnel_major_casing: null,
  tunnel_major: "tunnel_major",
  tunnel_motorway_casing: null,
  tunnel_motorway: "tunnel_motorway",

  // They fold service roads into road_minor-casing.
  road_service_casing: null,
  road_minor_casing: "road_minor-casing",
  road_secondary_tertiary_casing: "road_secondary_tertiary-casing",

  // They have road_primary but no casing for it
  road_primary_casing: null,
  road_trunk_casing: "road_trunk-casing",
  road_motorway_ramp_casing: "road_major_motorway_ramp-casing",
  road_motorway_casing: "road_major_motorway-casing",

  road_minor: "road_minor",
  road_secondary_tertiary: "road_secondary_tertiary",
  road_primary: "road_primary",
  road_trunk: "road_trunk",
  road_motorway_ramp: "road_major_motorway_ramp",
  road_motorway: "road_major_motorway",

  rail_line: "railway",
  rail_line_dash: null,
  rail_transit_line: "railway-transit",
  rail_transit_line_dash: null,

  building: "building",

  bridge_waterway_casing: "waterway-bridge-case",
  bridge_waterway: "waterway-bridge",

  // We split disputed boundaries out of their boundary_country
  boundary_disputed: null,
  boundary_country: "boundary_country",

  // They label no waterways, and label water only as lines
  label_water_line_minor: null,
  label_water_line_major: "water_name",
  label_water_point: null,

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
}

/**
 * Tweaks the Graphics basemap layers to meet Datawrapper's expected structure.
 *
 * The Graphics basemap styles the maps created in Datawrapper's map-maker tool.
 * We share this basemap with Datawrapper, who load it into their tool. They ask
 * that we minimise structural changes (ID changes, new/removed layers, etc) versus
 * their stock basemap (`app/res/graphics-map-style.json`).
 *
 * This function tries its best to fulfill this:
 * * for every basemap layer that has an equivalent in Datawrapper's stock style, we swap its ID
 *   to use Datawrapper's
 * * drop the `iml` provenance stamp
 *
 * @param {import("../../core/style.js").ResolvedLayer[]} layers
 */
export function adaptForDatawrapper(layers) {
  const unused = new Set(Object.keys(DATAWRAPPER_IDS))
  const unmapped = []

  const adapted = layers.map((layer) => {
    if (!(layer.id in DATAWRAPPER_IDS)) {
      unmapped.push(layer.id)
      return stripProvenance(layer)
    }

    unused.delete(layer.id)
    const target = DATAWRAPPER_IDS[layer.id]

    return stripProvenance(target === null ? layer : { ...layer, id: target })
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
