export function merge(...parts: Style[]): Style;
/**
 * Accumulates {@link StyleConfig} through immutable `.apply`/`.theme`/`.patch`
 * calls, resolving to layers only at `.build`. Subclasses decide how the style
 * function's output becomes layers.
 *
 * @abstract
 */
export class Builder {
    /**
     * @param {string | undefined} name Stamped as `iml.style` on every built layer.
     * @param {StyleFn} fn
     * @param {StyleConfig} [config]
     */
    constructor(name: string | undefined, fn: StyleFn, config?: StyleConfig);
    name: string;
    fn: StyleFn;
    config: StyleConfig;
    /**
     * A new builder of the same kind carrying the merged config.
     *
     * @param {StyleConfig} next
     */
    withConfig(next: StyleConfig): this;
    /**
     * A new builder with `base` merged underneath its own config: the builder's own
     * fields win, unset ones fill from `base`, and its filters AND with `base`'s
     * first.
     *
     * @param {StyleConfig} base
     */
    inherit(base: StyleConfig): this;
    /**
     * @param {StyleConfig} config
     * @returns {this}
     */
    clone(config: StyleConfig): this;
    /**
     * Binds the layers to a source.
     *
     * @example
     * ```js
     * WaterOcean.apply({ source: "openmaptiles", sourceLayer: "water", filter: f.cls("ocean") })
     * ```
     *
     * @param {LayerContext} [context]
     * @returns {this}
     */
    apply(context?: LayerContext): this;
    /**
     * Accumulates rendering preferences, merged over any already set.
     *
     * @param {Theme} theme
     * @returns {this}
     */
    theme(theme: Theme): this;
    /**
     * Accumulates a patch merged onto every built layer.
     *
     * @param {object} body
     * @returns {this}
     */
    patchAll(body: object): this;
    /**
     * Accumulates a per-layer patch: a `(layer) => layer` transform applied to each
     * layer, or an `{ id: partial }` map merged onto the matching layers (others
     * untouched). Lets a style be reapplied under fresh ids without colliding.
     *
     * @example
     * ```js
     * Rail.patch((layer) => ({ ...layer, id: layer.id.replace("rail_line", "rail_transit_line") }))
     * Rail.patch({ rail_line: { id: "rail_transit_line" }, rail_line_dash: { id: "rail_transit_line_dash" } })
     * ```
     *
     * @param {((layer: ResolvedLayer) => ResolvedLayer) | Record<string, object>} spec
     * @returns {this}
     */
    patch(spec: ((layer: ResolvedLayer) => ResolvedLayer) | Record<string, object>): this;
    /**
     * Resolves the accumulated config to bound, patched, renamed layers, each
     * stamped with `iml.style`.
     *
     * @returns {ResolvedLayer[]}
     */
    build(): ResolvedLayer[];
    /**
     * Selects which of the style function's layers to keep.
     *
     * @param {Style[]} layers
     */
    resolve(layers: Style[]): ResolvedLayer[];
    /**
     * The glyphs URL this style needs, or `undefined` if none of its layers render
     * text.
     */
    getGlyphsUrl(): string;
    /**
     * The sprite URL this style needs, or `undefined` if none of its layers render
     * an icon.
     */
    getSpriteUrl(): string;
}
/**
 * A builder narrowed to one layer of a style, returned by
 * {@link StyleHandle#onlyLayer}.
 */
export class SingleLayerHandle extends Builder {
    /**
     * @param {string | undefined} name
     * @param {StyleFn} fn
     * @param {string} id
     * @param {StyleConfig} [config]
     */
    constructor(name: string | undefined, fn: StyleFn, id: string, config?: StyleConfig);
    id: string;
    /** @param {StyleConfig} config */
    clone(config: StyleConfig): this;
}
/**
 * A builder for a style — a stack of one or more layers. Chain
 * `.apply`/`.theme`/`.patch`, then `.build` for its bound layers.
 */
export class StyleHandle extends Builder {
    /** @param {StyleConfig} config */
    clone(config: StyleConfig): this;
    /**
     * Narrows to the single layer with the given id, preserving accumulated config.
     *
     * @param {string} id
     */
    onlyLayer(id: string): SingleLayerHandle;
    /**
     * The style's raw, unbound layers. An escape hatch for introspection.
     *
     * @param {Theme} [theme]
     */
    layers(theme?: Theme): Style[];
}
export function style(name: string, fn: StyleFn): StyleHandle;
/**
 * A MapBox/MapLibre layer minus its source binding (`source`, `source-layer`,
 * `filter`), which `.apply` supplies.
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
 * A `Style` resolved into a complete GL layer, with its source binding.
 */
export type ResolvedLayer = Style & {
    id: string;
    source?: string;
    "source-layer"?: string;
    filter?: import("../filter/index.js").Expression;
    [block: string]: any;
};
/**
 * Rendering preferences a style function reads to shape its output.
 */
export type Theme = {
    textField?: string | string[];
};
/**
 * A style body: produces its layers' `Style`s from a `Theme`.
 */
export type StyleFn = (theme: Theme) => Style[];
/**
 * The source binding passed to `.apply`.
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
    filter?: import("../filter/index.js").Filter | any[];
};
/**
 * A patch entry: `all` merges `body` onto every layer; `each` replaces each layer
 * with `fn(layer)`; `byId` merges a partial onto the layer whose id matches, others
 * untouched.
 */
export type Patch = {
    kind: "all";
    body: object;
} | {
    kind: "each";
    fn: (layer: ResolvedLayer) => ResolvedLayer;
} | {
    kind: "byId";
    map: Record<string, object>;
};
/**
 * The config a builder accumulates until `.build` resolves it.
 */
export type StyleConfig = {
    context?: LayerContext;
    theme?: Theme;
    /**
     * Applied to built layers in order
     */
    patches?: Patch[];
};
