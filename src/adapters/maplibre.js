import { needsGlyphs, needsSprite } from "../core/resources.js"

/**
 * @import { ResolvedLayer } from "../core/style.js"
 * @import { Resources } from "../core/resources.js"
 * @import { DocumentFields } from "../core/group.js"
 */

/**
 * The subset of `sources` that `layers` reference by `source` name.
 *
 * @param {Record<string, object>} sources
 * @param {ResolvedLayer[]} layers
 */
const referencedSources = (sources, layers) => {
  const used = new Set(layers.map((layer) => layer.source).filter(Boolean))
  return Object.fromEntries(Object.entries(sources).filter(([name]) => used.has(name)))
}

/**
 * A MapLibre map instance, narrowed to the imperative methods used here.
 *
 * @typedef {{
 *   addSource: Function,
 *   getSource: Function,
 *   addLayer: Function,
 *   setGlyphs: Function,
 *   setSprite: Function,
 * }} MapLibreMap
 */

/**
 * Adds a `Resources`' sources to a live map and sets its glyphs and sprite URLs.
 * Idempotent: a source already present by name is left untouched.
 *
 * @param {MapLibreMap} map
 * @param {Resources} resources
 */
export const applyResources = (map, resources) => {
  for (const [name, def] of Object.entries(resources.sources)) {
    if (map.getSource(name) === undefined) {
      map.addSource(name, def)
    }
  }

  map.setGlyphs(resources.glyphs)
  map.setSprite(resources.sprite)
}

/**
 * Adds built layers to a live map, in order — each drawn above the last.
 *
 * @param {MapLibreMap} map
 * @param {ResolvedLayer[]} layers
 */
export const applyLayers = (map, layers) => {
  for (const layer of layers) {
    map.addLayer(layer)
  }
}

/**
 * A complete GL style document. Sources are tree-shaken to those the layers
 * reference; glyphs and sprite are emitted only when a layer needs them.
 *
 * @param {ResolvedLayer[]} layers
 * @param {Resources | undefined} resources
 * @param {DocumentFields} [document]
 * @returns {object}
 */
export const glStyle = (layers, resources, document = {}) => {
  const { version, name, metadata } = document

  const needsText = needsGlyphs(layers)
  const needsIcons = needsSprite(layers)

  const glyphs = needsText ? resources?.glyphs : undefined
  const sprite = needsIcons ? resources?.sprite : undefined

  return {
    version: version ?? 8,
    ...(name !== undefined && { name }),
    ...(glyphs !== undefined && { glyphs }),
    ...(sprite !== undefined && { sprite }),
    ...(metadata !== undefined && { metadata }),
    sources: referencedSources(resources?.sources ?? {}, layers),
    layers,
  }
}
