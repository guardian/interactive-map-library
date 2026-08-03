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
     * @returns {this}
     */
    withConfig(next: StyleConfig): this;
    /**
     * A new builder with `base` merged underneath its own config: the builder's own
     * fields win, unset ones fill from `base`, and its filters AND with `base`'s
     * first.
     *
     * @param {StyleConfig} base
     * @returns {this}
     */
    inherit(base: StyleConfig): this;
    /**
     * @abstract
     * @param {StyleConfig} config
     * @returns {this}
     */
    clone(config: StyleConfig): this;
    /**
     * Binds the layers to a source.
     *
     * @example
     * ```js
     * Ocean.apply({ source: "openmaptiles", sourceLayer: "water", filter: f.cls("ocean") })
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
     * @param {object} patch
     * @returns {this}
     */
    patch(patch: object): this;
    /**
     * Accumulates an id rewrite, letting a style be reapplied without its ids
     * colliding.
     *
     * @example
     * ```js
     * Railway.renameIds((id) => id.replace("railway", "railway-transit"))
     * Railway.renameIds({ railway: "railway-transit" })
     * ```
     *
     * @param {IdRename} rename
     * @returns {this}
     */
    renameIds(rename: IdRename): this;
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
     * @returns {ResolvedLayer[]}
     */
    resolve(layers: Style[]): ResolvedLayer[];
    /**
     * The glyphs URL this style needs, or `undefined` if none of its layers render
     * text.
     *
     * @returns {string | undefined}
     */
    getGlyphsUrl(): string | undefined;
    /**
     * The sprite URL this style needs, or `undefined` if none of its layers render
     * an icon.
     *
     * @returns {string | undefined}
     */
    getSpriteUrl(): string | undefined;
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
 * The config a builder accumulates until `.build` resolves it.
 */
export type StyleConfig = {
    context?: LayerContext;
    theme?: Theme;
    /**
     * Applied verbatim to every built layer, in order
     */
    patches?: object[];
    /**
     * Rewrite built layer ids, in order
     */
    renames?: IdRename[];
};
/**
 * How to rewrite built layer ids: a `(id) => newId` function, or an old-to-new
 * lookup (missing ids left unchanged).
 */
export type IdRename = ((id: string) => string) | Record<string, string>;
