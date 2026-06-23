export function compose(...parts: Style[]): Style;
/**
 * Re-usable style properties for a MapBox/MapLibre layer.
 *
 * `source`, `source-layer` and `filter` are absent – the properties that
 * bind a layer to a specific source.
 */
export type Style = {
    id?: string;
    type?: string;
    layout?: object;
    paint?: object;
    minzoom?: number;
    maxzoom?: number;
};
/**
 * A `Style` resolved into a complete GL layer, with "source", "source-layer",
 * "filter" and any other properties.
 */
export type ResolvedLayer = Style & {
    id: string;
    source?: string;
    "source-layer"?: string;
    filter?: import("./filter/index.js").Expression;
    [block: string]: any;
};
/**
 * A function producing a `Style` from a resolved `Theme`.
 *
 * `StyleFn`s are intended to be used with the `Stylesheet` API, where they're passed
 * un-called to `layer`: `layer(LandcoverIce, { filter: ... })`.
 *
 * But they can also be invoked directly, outside of this API.
 */
export type StyleFn = (theme: import("./stylesheet.js").Theme) => Style;
