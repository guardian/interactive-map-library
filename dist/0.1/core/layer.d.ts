export function mergeParams(parent: LayerParams, child: LayerParams): LayerParams;
export function makeLayer(style: StyleFn, params: LayerParams): ResolvedLayer;
export function group(params?: LayerParams): {
    /** @param {LayerParams} [childParams] */
    group: (childParams?: LayerParams) => /*elided*/ any;
    /**
     * @param {StyleFn} style
     * @param {LayerParams} [layerParams]
     */
    layer: (style: StyleFn, layerParams?: LayerParams) => ResolvedLayer;
    /** @param {(layer: typeof self.layer, group: typeof self) => void} fn */
    within: (fn: (layer: (style: StyleFn, layerParams?: LayerParams) => ResolvedLayer, group: /*elided*/ any) => void) => ResolvedLayer[];
};
export function layer(style: StyleFn, params?: LayerParams): ResolvedLayer;
import type { LayerParams } from "./stylesheet.js";
import type { StyleFn } from "./style.js";
import type { ResolvedLayer } from "./style.js";
