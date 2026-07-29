/**
 * @import { ResolvedLayer } from "./style.js"
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
 * Reorders a set of road styles so every casing draws before every fill, keeping
 * each road's relative order. Surface roads need this so a later road's casing
 * never paints over an earlier road's fill at a junction. A layer whose id ends
 * "-casing" is a casing. The sort is stable, so it is a partition.
 *
 * Each argument is one road's layers (an `.apply(...)` result); they are
 * flattened, so roads pass in without wrapping: `casingsFirst(minor, major)`.
 *
 * @param {ResolvedLayer[][]} roads
 */
export const casingsFirst = (...roads) => {
  const layers = roads.flat()
  /** @param {ResolvedLayer} layer */
  const isCasing = (layer) => layer.id.endsWith("-casing")
  return layers.sort((a, b) => Number(isCasing(b)) - Number(isCasing(a)))
}

/**
 * Assembles a complete GL style document from its furniture and an ordered,
 * arbitrarily-nested list of layers — an `.apply(...)` result, or a group of
 * them, drops straight in without spreading, and is flattened. Order is z-order.
 *
 * @param {Furniture} furniture
 * @param {any[]} layers An ordered list of layers and nested layer groups
 */
export const buildGlStyle = (furniture, layers) => {
  const { sources, glyphs, sprite, name, metadata, version } = furniture

  return {
    version: version ?? 8,
    ...(name !== undefined && { name }),
    ...(glyphs !== undefined && { glyphs }),
    ...(sprite !== undefined && { sprite }),
    ...(metadata !== undefined && { metadata }),
    ...(sources !== undefined && { sources }),
    layers: layers.flat(Infinity),
  }
}
