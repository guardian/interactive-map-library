// TODO: type this with MapBox/MapLibre types?
/**
 * Re-usable style properties for a MapBox/MapLibre layer.
 *
 * `source`, `source-layer` and `filter` are absent – the properties that
 * bind a layer to a specific source.
 *
 * @typedef {object} Style
 * @property {string} [id]
 * @property {string} [type]
 * @property {object} [layout]
 * @property {object} [paint]
 * @property {number} [minzoom]
 * @property {number} [maxzoom]
 */

/**
 * A `Style` resolved into a complete GL layer, with "source", "source-layer",
 * "filter" and any other properties.
 *
 * @typedef {Style & {
 *   id: string,
 *   source?: string,
 *   "source-layer"?: string,
 *   filter?: import("./filter/index.js").Expression,
 *   [block: string]: any,
 * }} ResolvedLayer
 */

/**
 * A function producing a `Style` from a resolved `Theme`.
 *
 * `StyleFn`s are intended to be used with the `Stylesheet` API, where they're passed
 * un-called to `layer`: `layer(LandcoverIce, { filter: ... })`.
 *
 * But they can also be invoked directly, outside of this API.
 *
 * @callback StyleFn
 * @param {import("./stylesheet.js").Theme} theme
 * @returns {Style}
 */

/**
 * Merges style parts into a single layer. `layout` and `paint` objects are
 * shallow-merged across parts; all other keys are overwritten last-wins.
 *
 * @param {...Style} parts
 * @returns {Style}
 */
export const compose = (...parts) => {
  const layer = {}

  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      if (["layout", "paint"].includes(key)) {
        layer[key] = { ...layer[key], ...value }
      } else {
        layer[key] = value
      }
    }
  }

  return layer
}
