export function applyResources(map: MapLibreMap, resources: Resources): void;
export function applyLayers(map: MapLibreMap, layers: ResolvedLayer[]): void;
export function glStyle(layers: ResolvedLayer[], resources: Resources | undefined, document?: DocumentFields): object;
/**
 * A MapLibre map instance, narrowed to the imperative methods used here.
 */
export type MapLibreMap = {
    addSource: Function;
    getSource: Function;
    addLayer: Function;
    setGlyphs: Function;
    setSprite: Function;
};
import type { Resources } from "../core/resources.js";
import type { ResolvedLayer } from "../core/style.js";
import type { DocumentFields } from "../core/group.js";
