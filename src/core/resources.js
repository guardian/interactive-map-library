/**
 * Fixed URLs the library's styles are authored against. A style needing glyphs
 * (text) or a sprite (icons) resolves to these; the need is read from the layer
 * body, so nothing carries the URL explicitly.
 */

export const GLYPHS_URL = "https://interactive.guim.co.uk/maptiles/fonts/{fontstack}/{range}.pbf"

export const SPRITE_URL = "https://tiles.dwcdn.net/sprites/dwsprites"

/**
 * Whether any layer renders text, needing a glyphs URL.
 */
export const needsGlyphs = (layers) =>
  layers.some((layer) => layer.layout?.["text-field"] !== undefined)

/**
 * Whether any layer renders an icon, needing a sprite.
 */
export const needsSprite = (layers) =>
  layers.some((layer) => layer.layout?.["icon-image"] !== undefined)

/**
 * The externals a basemap's layers reference: its sources, plus the shared glyphs
 * and sprite URLs.
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
   * Adds every source and sets the glyphs and sprite URLs on a MapLibre map.
   * Idempotent.
   *
   * @param {{ addSource: Function, getSource: Function, setGlyphs: Function, setSprite: Function }} map
   */
  prepareMapLibre(map) {
    for (const [name, def] of Object.entries(this.sources)) {
      if (map.getSource(name) === undefined) {
        map.addSource(name, def)
      }
    }

    map.setGlyphs(this.glyphs)
    map.setSprite(this.sprite)
  }
}

/** 
 * @param {Record<string, object>} sources
 */
export const resources = (sources) => new Resources(sources)
