import { applyResources } from "../adapters/maplibre.js"

/**
 * Fixed URLs the library's styles are authored against. A style needing glyphs
 * (text) or a sprite (icons) resolves to these; the need is read from the layer
 * body, so nothing carries the URL explicitly.
 */

export const GLYPHS_URL = "https://interactive.guim.co.uk/maptiles/fonts/{fontstack}/{range}.pbf"

export const SPRITE_URL = "https://tiles.dwcdn.net/sprites/dwsprites"

/** Whether any layer renders text, needing a glyphs URL. */
export const needsGlyphs = (layers) =>
  layers.some((layer) => layer.layout?.["text-field"] !== undefined)

/** Whether any layer renders an icon, needing a sprite. */
export const needsSprite = (layers) =>
  layers.some((layer) => layer.layout?.["icon-image"] !== undefined)

/**
 * The externals a basemap's layers reference: its sources, plus the shared glyphs
 * and sprite URLs. A plain data holder; the `prepare.<target>` namespace wires it
 * onto a live map through that target's adapter.
 */
export class Resources {
  /**
   * @param {Record<string, object>} sources Source definitions keyed by name.
   */
  constructor(sources) {
    this.sources = sources
    this.glyphs = GLYPHS_URL
    this.sprite = SPRITE_URL
  }

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
  get prepare() {
    return {
      maplibre: (map) => applyResources(map, this),
    }
  }
}

/** @param {Record<string, object>} sources */
export const resources = (sources) => new Resources(sources)
