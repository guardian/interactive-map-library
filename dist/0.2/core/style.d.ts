export function merge(...parts: Style[]): Style;
/**
 * The shared builder body: accumulates {@link StyleConfig} through immutable
 * `.apply`/`.theme`/`.patch` calls, resolving to layers only at `.build`.
 * Subclasses supply how the style function's output becomes layers.
 *
 * @abstract
 */
export class Builder {
    /**
     * @param {string | undefined} name The style name, stamped as `iml.style` on
     *   every built layer. `undefined` for a nameless ad-hoc style.
     * @param {StyleFn} fn
     * @param {StyleConfig} [config]
     */
    constructor(name: string | undefined, fn: StyleFn, config?: StyleConfig);
    name: string;
    fn: StyleFn;
    config: StyleConfig;
    /**
     * Returns a new builder of the same kind carrying the merged config. Each
     * subclass implements {@link clone} so its extra fields (eg. a selected layer
     * id) survive the copy.
     *
     * @param {StyleConfig} next
     * @returns {this}
     */
    withConfig(next: StyleConfig): this;
    /**
     * Returns a new builder with `base` merged *underneath* this builder's own
     * config: the builder's own `source`/`source-layer`/`theme` win, unset fields
     * fill from `base`, and filters AND with `base`'s first. This is the
     * inheritance a group applies when pushing its `theme`/source-binding down to a
     * child that hasn't set its own.
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
     * Accumulates source-binding context (`source`/`source-layer`/`filter`).
     *
     * @param {LayerContext} [context]
     * @returns {this}
     */
    apply(context?: LayerContext): this;
    /**
     * Accumulates rendering preferences, shallow-merged over any already set.
     *
     * @param {Theme} theme
     * @returns {this}
     */
    theme(theme: Theme): this;
    /**
     * Accumulates a verbatim patch applied to every built layer at `.build`.
     *
     * @param {object} patch
     * @returns {this}
     */
    patch(patch: object): this;
    /**
     * Accumulates an id rewrite applied to every built layer at `.build`, after
     * patches. Lets a style be reapplied without its ids colliding, eg.
     * `Railway.renameIds((id) => id.replace("railway", "railway-transit"))` or
     * `Railway.renameIds({ railway: "railway-transit" })`.
     *
     * @param {IdRename} rename
     * @returns {this}
     */
    renameIds(rename: IdRename): this;
    /**
     * Resolves the accumulated config to bound, patched, renamed layers, each
     * stamped with `iml.style`. A group walk adds `iml.group` on top of this.
     *
     * @returns {ResolvedLayer[]}
     */
    build(): ResolvedLayer[];
    /**
     * Selects the produced layers from the style function's raw output. Overridden
     * by {@link SingleLayerHandle} to pick one.
     *
     * @param {Style[]} layers
     * @returns {ResolvedLayer[]}
     */
    resolve(layers: Style[]): ResolvedLayer[];
    /**
     * The glyphs URL this style needs, or `undefined` if none of its layers render
     * text. Glyphs are a fixed library constant a text style is authored against.
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
 * A builder for a single named layer within a style, returned by
 * {@link StyleHandle.onlyLayer}. `.build` resolves to that one layer.
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
 * A builder for a style: a stack of one or more layers. The entrypoint for using
 * a style — you import it, chain `.apply`/`.theme`/`.patch`, and `.build` to get
 * its bound layers.
 */
export class StyleHandle extends Builder {
    /** @param {StyleConfig} config */
    clone(config: StyleConfig): this;
    /**
     * Selects the single layer with the given id, returning a builder whose
     * `.build` yields that one layer while preserving accumulated config.
     *
     * @param {string} id
     */
    onlyLayer(id: string): SingleLayerHandle;
    /**
     * The style's raw, unbound layers. An escape hatch for introspection; most
     * code uses `.build`.
     *
     * @param {Theme} [theme]
     */
    layers(theme?: Theme): Style[];
}
export function style(name: string, fn: StyleFn): StyleHandle;
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
 * A function producing the `Style`s of a style's layers from a resolved
 * `Theme`. Wrapped by {@link style} to make the style itself the entrypoint.
 */
export type StyleFn = (theme: Theme) => Style[];
/**
 * The context binding a style's layers to a source: its address into the tiles.
 * Passed to `.apply` as plain data and accumulated on the builder; theme and
 * patches are set through their own methods.
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
 * The accumulated configuration a builder carries until `.build()` resolves it.
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
 * How to rewrite built layer ids: a function `(id) => newId`, or a lookup object
 * mapping old id to new id (ids absent from the map are left unchanged).
 */
export type IdRename = ((id: string) => string) | Record<string, string>;
