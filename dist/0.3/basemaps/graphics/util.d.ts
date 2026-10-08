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
export function adaptForDatawrapper(layers: import("../../core/style.js").ResolvedLayer[]): ({
    [block: string]: any;
    id: string;
    type?: string;
    layout?: object;
    paint?: object;
    minzoom?: number;
    maxzoom?: number;
    source?: string;
    "source-layer"?: string;
    filter?: import("../../filter/index.js").Expression;
} | {
    id: any;
    type: string;
    source: string;
    "source-layer": string;
    filter: any;
    layout: {
        visibility: string;
    };
})[];
export namespace DATAWRAPPER_IDS {
    let background: string;
    let land_residential: string;
    let land_ice: string;
    let land_grass: string;
    let land_park: string;
    let land_wood: string;
    let terrain_mountain_1: string;
    let terrain_mountain_2: string;
    let terrain_mountain_3: string;
    let terrain_mountain_4: string;
    let terrain_mountain_5: string;
    let terrain_mountain_6: string;
    let water_waterway: string;
    let water_body_outline: string;
    let water_body: string;
    let water_ocean_outline: string;
    let water_ocean: string;
    let road_path: string;
    let aeroway_area: string;
    let aeroway_taxiway: string;
    let aeroway_runway: string;
    let tunnel_minor_casing: string;
    let tunnel_major_casing: string;
    let tunnel_motorway_casing: string;
    let road_service_casing: string;
    let road_minor_casing: string;
    let road_secondary_tertiary_casing: string;
    let road_primary_casing: string;
    let road_trunk_casing: string;
    let road_motorway_ramp_casing: string;
    let road_motorway_casing: string;
    let road_minor: string;
    let road_secondary_tertiary: string;
    let road_primary: string;
    let road_trunk: string;
    let road_motorway_ramp: string;
    let road_motorway: string;
    let rail_line_dash: string;
    let rail_line: string;
    let building: string;
    let bridge_waterway_casing: string;
    let bridge_waterway: string;
    let boundary_state: string;
    let boundary_disputed: string;
    let boundary_country: string;
    let label_water_point: string;
    let label_road_other: string;
    let label_road_motorway: string;
    let label_place_other: string;
    let label_place_suburb: string;
    let label_place_village: string;
    let label_place_town: string;
    let label_place_city_minor: string;
    let label_place_city_major: string;
    let label_place_capital: string;
    let label_place_state: string;
    let label_place_country_minor: string;
    let label_place_country_major: string;
    let building_3d: string;
}
