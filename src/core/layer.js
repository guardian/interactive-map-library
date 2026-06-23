import { Filter, expr } from "./filter/index.js"

/**
 * @import { ResolvedLayer, StyleFn } from "./style.js"
 * @import { LayerParams } from "./stylesheet.js"
 */

/**
 * AND-s the given parent and child filters.
 * Accepts either `Filter` instances, or raw GL filter expressions.
 *
 * @param {import("./filter/index.js").Filter | any[]} [parent]
 * @param {import("./filter/index.js").Filter | any[]} [child]
 */
const combineFilters = (parent, child) => {
  if (parent === undefined) {
    return child
  }

  if (child === undefined) {
    return parent
  }

  // If we receive a raw filter expression, wrap it in a `Filter`
  const parentFilter = parent instanceof Filter ? parent : new Filter([parent])

  return parentFilter.and(child)
}

/**
 * Merges two `patch` maps, combining the properties within each block so a
 * child adds to the parent rather than replacing a whole block.
 *
 * @param {LayerParams["patch"]} [parent]
 * @param {LayerParams["patch"]} [child]
 * @returns {LayerParams["patch"]}
 */
const mergePatch = (parent = {}, child = {}) => {
  const merged = { ...parent }

  for (const [block, props] of Object.entries(child)) {
    // @ts-ignore
    merged[block] = { ...merged[block], ...props }
  }

  return merged
}

/**
 * Child keys overwrite parent keys, except for "theme"s and "patch"es which
 * are merged, and "filter"s which are AND-ed together.
 *
 * @param {LayerParams} parent
 * @param {LayerParams} child
 * @returns {LayerParams}
 */
export const mergeParams = (parent, child) => {
  return {
    ...parent,
    ...child,
    theme: { ...parent.theme, ...child.theme },
    patch: mergePatch(parent.patch, child.patch),
    filter: combineFilters(parent.filter, child.filter),
  }
}

/**
 * @param {StyleFn} style
 * @param {LayerParams} params
 * @returns {ResolvedLayer}
 */
export const makeLayer = (style, params) => {
  // We expect uninvoked style functions here: `LandcoverGrass`, not `LandcoverGrass()`.
  // If we receive the result of a style function, reject it.
  if (typeof style !== "function") {
    throw new TypeError(
      "expected a style function (`(theme) => layer`), but got on already-invoked layer object." +
        "Pass the style itself without calling it: `LandcoverGrass` vs `LandcoverGrass()`.",
    )
  }

  const { source, sourceLayer, filter, patch, theme, id } = params

  /** @type {ResolvedLayer} */
  const layer = style(theme ?? {})

  if (id !== undefined) {
    layer.id = id
  }

  if (source !== undefined) {
    layer.source = source
  }

  if (sourceLayer !== undefined) {
    layer["source-layer"] = sourceLayer
  }

  const resolvedFilter = expr(filter)

  if (resolvedFilter !== undefined) {
    layer.filter = resolvedFilter
  }

  if (patch) {
    for (const [block, props] of Object.entries(patch)) {
      for (const [property, name] of Object.entries(props)) {
        layer[block] = { ...layer[block], [property]: { property: name, type: "identity" } }
      }
    }
  }

  return layer
}

/**
 * Creates shared config that's inherited by subsequent layer calls.
 *
 * Use `layer` on the created group to create layers with the shared config.
 *
 * @example
 * ```
 * const omt = group({ source: "openmaptiles" })
 * const transport = omt.group({ sourceLayer: "transportation" })
 * const road = transport.layer(RoadMinor, { filter: line().cls("minor") })
 * ```
 *
 * Use `within` to more conveniently define multiple layers.
 *
 * @example
 * ```
 * const omt = group({ source: "openmaptiles" })
 * const transport = omt.group({ sourceLayer: "transportation" })
 *
 * transport.within((layer) => {
 *   layer(RoadMinor, { filter: line().cls("minor") })
 * })
 * ```
 *
 * @param {LayerParams} [params]
 */
export const group = (params = {}) => {
  const self = {
    /** @param {LayerParams} [childParams] */
    group: (childParams = {}) => group(mergeParams(params, childParams)),

    /**
     * @param {StyleFn} style
     * @param {LayerParams} [layerParams]
     */
    layer: (style, layerParams = {}) => makeLayer(style, mergeParams(params, layerParams)),

    /** @param {(layer: typeof self.layer, group: typeof self) => void} fn */
    within: (fn) => {
      /** @type {ResolvedLayer[]} */
      const layers = []

      /**
       * @param {StyleFn} style
       * @param {LayerParams} [layerParams]
       */
      const collect = (style, layerParams = {}) => {
        const layer = self.layer(style, layerParams)
        layers.push(layer)
        return layer
      }

      fn(collect, self)

      return layers
    },
  }

  return self
}

/**
 * @param {StyleFn} style
 * @param {LayerParams} [params]
 * @returns {ResolvedLayer}
 */
export const layer = (style, params = {}) => makeLayer(style, params)
