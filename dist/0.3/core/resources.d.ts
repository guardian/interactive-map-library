/**
 * Fixed URLs the library's styles are authored against. A style needing glyphs
 * (text) or a sprite (icons) resolves to these; the need is read from the layer
 * body, so nothing carries the URL explicitly.
 */
export const GLYPHS_URL: "https://interactive.guim.co.uk/maptiles/fonts/{fontstack}/{range}.pbf";
export const SPRITE_URL: "https://tiles.dwcdn.net/sprites/dwsprites";
export function needsGlyphs(layers: any): any;
export function needsSprite(layers: any): any;
/**
 * The externals a basemap's layers reference: its sources, plus the shared glyphs
 * and sprite URLs. A plain data holder; the `prepare.<target>` namespace wires it
 * onto a live map through that target's adapter.
 */
export class Resources {
    /**
     * @param {Record<string, object>} sources Source definitions keyed by name.
     */
    constructor(sources: Record<string, object>);
    sources: Record<string, any>;
    glyphs: string;
    sprite: string;
    /**
     * Wires these resources onto a live map, keyed by map library. Each member
     * takes a map instance, adds the sources and sets the glyphs/sprite URLs, and
     * returns nothing.
     *
     * @example
     * ```js
     * resources.prepare.maplibre(map)
     * ```
     */
    get prepare(): {
        maplibre: (map: any) => void;
    };
}
export function resources(sources: Record<string, object>): Resources;
