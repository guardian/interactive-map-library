import { Filter, expr } from "./filter/index.js"

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
 * Rendering preferences a style function reads to shape its output.
 *
 * @typedef {object} Theme
 * @property {string | string[]} [textField]
 */

/**
 * A function producing the `Style`s of a style's layers from a resolved
 * `Theme`. Wrapped by {@link style} to make the style itself the entrypoint.
 *
 * @callback StyleFn
 * @param {Theme} theme
 * @returns {Style[]}
 */

/**
 * The context binding a style's layers to a source: its address into the tiles,
 * plus theme and assembly overrides. Passed to `.apply` as plain data.
 *
 * @typedef {object} LayerContext
 * @property {string} [source] The layers' "source" property
 * @property {string} [sourceLayer] The layers' "source-layer" property
 * @property {import("./filter/index.js").Filter | any[]} [filter] AND-ed with each layer's own filter
 * @property {object} [patch] Overrides layer properties with values read verbatim from a feature
 * attribute, keyed by block then property, eg. `patch: { paint: { "fill-extrusion-height": "render_height" } }`
 * @property {Theme} [theme] Rendering preferences passed to the style function
 */

/**
 * Merges style parts into a single layer. `layout` and `paint` objects are
 * shallow-merged across parts; all other keys are overwritten last-wins.
 *
 * @param {...Style} parts
 * @returns {Style}
 */
export const merge = (...parts) => {
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

/**
 * AND-s a layer's own filter with the context filter. Either may be absent, and
 * each may be a `Filter` builder or a raw GL expression.
 *
 * @param {import("./filter/index.js").Filter | any[]} [own]
 * @param {import("./filter/index.js").Filter | any[]} [context]
 * @returns {import("./filter/index.js").Expression | undefined}
 */
const combineFilters = (own, context) => {
  if (own === undefined) {
    return expr(context)
  }

  if (context === undefined) {
    return expr(own)
  }

  const ownFilter = own instanceof Filter ? own : new Filter([own])

  return ownFilter.and(context).compile()
}

/**
 * Binds a single built layer to a source, stamping the context's `source`,
 * `source-layer`, `filter` and `patch` onto it. The layer's own filter (if any)
 * is AND-ed with the context filter, so a shared filter cannot drift between the
 * layers of one style.
 *
 * @param {ResolvedLayer} layer
 * @param {LayerContext} context
 * @returns {ResolvedLayer}
 */
const bindLayer = (layer, context) => {
  const { source, sourceLayer, filter, patch } = context

  const bound = { ...layer }

  if (source !== undefined) {
    bound.source = source
  }

  if (sourceLayer !== undefined) {
    bound["source-layer"] = sourceLayer
  }

  const resolvedFilter = combineFilters(bound.filter, filter)

  if (resolvedFilter !== undefined) {
    bound.filter = resolvedFilter
  }

  if (patch) {
    for (const [block, props] of Object.entries(patch)) {
      for (const [property, name] of Object.entries(props)) {
        bound[block] = { ...bound[block], [property]: { property: name, type: "identity" } }
      }
    }
  }

  return bound
}

/**
 * A handle to a single named layer within a style, returned by
 * {@link StyleHandle.onlyLayer}. Its `.apply` returns one bound layer, not an
 * array.
 */
export class SingleLayerHandle {
  /**
   * @param {StyleFn} fn
   * @param {string} id
   */
  constructor(fn, id) {
    this.fn = fn
    this.id = id
  }

  /**
   * @param {LayerContext} [context]
   * @returns {ResolvedLayer}
   */
  apply(context = {}) {
    const layer = this.fn(context.theme ?? {}).find((l) => l.id === this.id)

    if (layer === undefined) {
      throw new Error(`no layer with id "${this.id}" in this style`)
    }

    return bindLayer(/** @type {ResolvedLayer} */ (layer), context)
  }
}

/**
 * A handle to a style: a stack of one or more layers. The entrypoint for using a
 * style — you import it and call `.apply(context)` to build and bind its layers.
 */
export class StyleHandle {
  /** @param {StyleFn} fn */
  constructor(fn) {
    this.fn = fn
  }

  /**
   * Builds the style's layers and binds `source`/`source-layer`/`filter`/`patch`
   * onto every one of them.
   *
   * @param {LayerContext} [context]
   * @returns {ResolvedLayer[]}
   */
  apply(context = {}) {
    const layers = /** @type {ResolvedLayer[]} */ (this.fn(context.theme ?? {}))
    return layers.map((layer) => bindLayer(layer, context))
  }

  /**
   * Selects the single layer with the given id, returning a handle whose
   * `.apply` yields that one bound layer.
   *
   * @param {string} id
   */
  onlyLayer(id) {
    return new SingleLayerHandle(this.fn, id)
  }

  /**
   * The style's raw, unbound layers. An escape hatch for introspection; most
   * code uses `.apply`.
   *
   * @param {Theme} [theme]
   */
  layers(theme = {}) {
    return this.fn(theme)
  }
}

/**
 * Wraps a style function as a {@link StyleHandle}, making the style itself the
 * entrypoint: `Ocean.apply(...)` builds and binds its layers.
 *
 * @param {StyleFn} fn
 */
export const style = (fn) => new StyleHandle(fn)
