export function merge(...parts: Style[]): Style;
/**
 * A handle to a single named layer within a style, returned by
 * {@link StyleHandle.onlyLayer}. Its `.apply` returns one bound layer, not an
 * array.
 */
export class SingleLayerHandle {
    /**
     * @param {StyleFn} fn
     * @param {string} id
     */
    constructor(fn: StyleFn, id: string);
    fn: StyleFn;
    id: string;
    /**
     * @param {LayerContext} [context]
     * @returns {ResolvedLayer}
     */
    apply(context?: LayerContext): ResolvedLayer;
}
/**
 * A handle to a style: a stack of one or more layers. The entrypoint for using a
 * style — you import it and call `.apply(context)` to build and bind its layers.
 */
export class StyleHandle {
    /** @param {StyleFn} fn */
    constructor(fn: StyleFn);
    fn: StyleFn;
    /**
     * Builds the style's layers and binds `source`/`source-layer`/`filter`/`patch`
     * onto every one of them.
     *
     * @param {LayerContext} [context]
     * @returns {ResolvedLayer[]}
     */
    apply(context?: LayerContext): ResolvedLayer[];
    /**
     * Selects the single layer with the given id, returning a handle whose
     * `.apply` yields that one bound layer.
     *
     * @param {string} id
     */
    onlyLayer(id: string): SingleLayerHandle;
    /**
     * The style's raw, unbound layers. An escape hatch for introspection; most
     * code uses `.apply`.
     *
     * @param {Theme} [theme]
     */
    layers(theme?: Theme): Style[];
}
export function style(fn: StyleFn): StyleHandle;
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
 * Rendering preferences a style function reads to shape its output.
 */
export type Theme = {
    textField?: string | string[];
};
/**
 * A function producing the `Style`s of a style's layers from a resolved
 * `Theme`. Wrapped by {@link style} to make the style itself the entrypoint.
 */
export type StyleFn = (theme: Theme) => Style[];
/**
 * The context binding a style's layers to a source: its address into the tiles,
 * plus theme and assembly overrides. Passed to `.apply` as plain data.
 */
export type LayerContext = {
    /**
     * The layers' "source" property
     */
    source?: string;
    /**
     * The layers' "source-layer" property
     */
    sourceLayer?: string;
    /**
     * AND-ed with each layer's own filter
     */
    filter?: import("./filter/index.js").Filter | any[];
    /**
     * Overrides layer properties with values read verbatim from a feature
     * attribute, keyed by block then property, eg. `patch: { paint: { "fill-extrusion-height": "render_height" } }`
     */
    patch?: object;
    /**
     * Rendering preferences passed to the style function
     */
    theme?: Theme;
};
