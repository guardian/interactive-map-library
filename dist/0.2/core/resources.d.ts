/**
 * Fixed URLs the library's styles are authored against. A style needing glyphs
 * (text) or a sprite (icons) resolves to these; the need is read from the layer
 * body, so nothing carries the URL explicitly.
 */
export const GLYPHS_URL: "https://interactive.guim.co.uk/maptiles/fonts/{fontstack}/{range}.pbf";
export const SPRITE_URL: "https://tiles.dwcdn.net/sprites/dwsprites";
export function needsGlyphs(layers: any): any;
export function needsSprite(layers: any): any;
