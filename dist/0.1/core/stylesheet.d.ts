/**
 * @import { ResolvedLayer, StyleFn } from "./style.js"
 */
/**
 * Rendering preferences a `StyleFn` reads to shape its output, resolved
 * most-specific-wins across `defaults` → `group` → layer.
 *
 * @typedef {object} Theme
 * @property {string | string[]} [textField]
 */
/**
 * The parameters for a layer: its address into the tiles plus theme and
 * assembly overrides. Shared by `defaults`, `group`, and each layer.
 *
 * @typedef {object} LayerParams
 * @property {string} [source] The layer's "source" property
 * @property {string} [sourceLayer] The layer's "source-layer" property
 * @property {import("./filter/index.js").Filter | any[]} [filter] The layer's "filter" property
 * @property {object} [patch] Overrides layer properties with values read verbatim from a feature
 * attribute, keyed by block then property, eg. `patch: { paint: { "fill-extrusion-height": "render_height" } }`
 * @property {Theme} [theme] Rendering preferences for the given style
 * @property {string} [id] The layer's "id" property, overriding the default from the given style
 */
/**
 * A GL style document's top-level fields, minus `layers`.
 *
 * @typedef {object} Furniture
 * @property {number} [version]
 * @property {string} [name]
 * @property {string} [glyphs]
 * @property {string} [sprite]
 * @property {object} [metadata]
 * @property {object} [sources]
 */
/**
 * Wrapper around a complete GL style document.
 */
export class Stylesheet {
    /** @param {Furniture} furniture */
    constructor(furniture?: Furniture);
    /** @private */
    private furniture;
    /** @private */
    private baseline;
    /**
     * @private
     * @type {ResolvedLayer[]}
     */
    private layers;
    /** @param {LayerParams} params */
    defaults(params?: LayerParams): void;
    /** @param {LayerParams} groupParams */
    group(groupParams?: LayerParams): {
        /** @param {LayerParams} [params] */
        group: (params?: LayerParams) => /*elided*/ any;
        /**
         * @param {StyleFn} style
         * @param {LayerParams} [params]
         */
        layer: (style: StyleFn, params?: LayerParams) => ResolvedLayer;
        /** @param {(layer: typeof sink.layer, group: typeof sink) => void} fn */
        within: (fn: (layer: (style: StyleFn, params?: LayerParams) => ResolvedLayer, group: /*elided*/ any) => void) => ResolvedLayer[];
    };
    /**
     * @param {StyleFn} style
     * @param {LayerParams} params
     */
    layer(style: StyleFn, params?: LayerParams): ResolvedLayer;
    build(): {
        layers: ResolvedLayer[];
        sources: any;
        metadata: any;
        sprite: string;
        glyphs: string;
        name: string;
        version: number;
    };
    /**
     * @private
     * @param {ReturnType<typeof makeGroup>} freeGroup
     */
    private sink;
}
/**
 * Rendering preferences a `StyleFn` reads to shape its output, resolved
 * most-specific-wins across `defaults` → `group` → layer.
 */
export type Theme = {
    textField?: string | string[];
};
/**
 * The parameters for a layer: its address into the tiles plus theme and
 * assembly overrides. Shared by `defaults`, `group`, and each layer.
 */
export type LayerParams = {
    /**
     * The layer's "source" property
     */
    source?: string;
    /**
     * The layer's "source-layer" property
     */
    sourceLayer?: string;
    /**
     * The layer's "filter" property
     */
    filter?: import("./filter/index.js").Filter | any[];
    /**
     * Overrides layer properties with values read verbatim from a feature
     * attribute, keyed by block then property, eg. `patch: { paint: { "fill-extrusion-height": "render_height" } }`
     */
    patch?: object;
    /**
     * Rendering preferences for the given style
     */
    theme?: Theme;
    /**
     * The layer's "id" property, overriding the default from the given style
     */
    id?: string;
};
/**
 * A GL style document's top-level fields, minus `layers`.
 */
export type Furniture = {
    version?: number;
    name?: string;
    glyphs?: string;
    sprite?: string;
    metadata?: object;
    sources?: object;
};
import type { StyleFn } from "./style.js";
import type { ResolvedLayer } from "./style.js";
