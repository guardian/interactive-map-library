import { Filter, expr } from "../filter/index.js"
import { GLYPHS_URL, SPRITE_URL, needsGlyphs, needsSprite } from "./resources.js"

// TODO: type this with MapBox/MapLibre types?
/**
 * A MapBox/MapLibre layer minus its source binding (`source`, `source-layer`,
 * `filter`), which `.apply` supplies.
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
 * A `Style` resolved into a complete GL layer, with its source binding.
 *
 * @typedef {Style & {
 *   id: string,
 *   source?: string,
 *   "source-layer"?: string,
 *   filter?: import("../filter/index.js").Expression,
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
 * A style body: produces its layers' `Style`s from a `Theme`.
 *
 * @callback StyleFn
 * @param {Theme} theme
 * @returns {Style[]}
 */

/**
 * The source binding passed to `.apply`.
 *
 * @typedef {object} LayerContext
 * @property {string} [source] The layers' "source" property
 * @property {string} [sourceLayer] The layers' "source-layer" property
 * @property {import("../filter/index.js").Filter | any[]} [filter] AND-ed with each layer's own filter
 */

/**
 * A patch entry: `all` merges `body` onto every layer; `each` replaces each layer
 * with `fn(layer)`; `byId` merges a partial onto the layer whose id matches, others
 * untouched.
 *
 * @typedef {{ kind: "all", body: object }
 *   | { kind: "each", fn: (layer: ResolvedLayer) => ResolvedLayer }
 *   | { kind: "byId", map: Record<string, object> }} Patch
 */

/**
 * The config a builder accumulates until `.build` resolves it.
 *
 * @typedef {object} StyleConfig
 * @property {LayerContext} [context]
 * @property {Theme} [theme]
 * @property {Patch[]} [patches] Applied to built layers in order
 */

/**
 * Merges style parts into a single layer. `layout` and `paint` shallow-merge
 * across parts; every other key is last-wins.
 *
 * @example
 * ```js
 * merge(pWaterFill, { id: "ocean", paint: { "fill-opacity": 0.8 } })
 * ```
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
 * AND-s two filters, either of which may be absent, a `Filter`, or a raw
 * expression.
 *
 * @param {import("../filter/index.js").Filter | any[]} [own]
 * @param {import("../filter/index.js").Filter | any[]} [context]
 * @returns {import("../filter/index.js").Expression | undefined}
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
 * Stamps the context's `source`, `source-layer` and `filter` onto a layer, its
 * own filter AND-ed with the context's.
 *
 * @param {ResolvedLayer} layer
 * @param {LayerContext} context
 * @returns {ResolvedLayer}
 */
const bindLayer = (layer, context) => {
  const { source, sourceLayer, filter } = context

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

  return bound
}

/**
 * @param {ResolvedLayer} layer
 * @param {Patch} patch
 * @returns {ResolvedLayer}
 */
const applyPatch = (layer, patch) => {
  if (patch.kind === "each") {
    return patch.fn(layer)
  }

  if (patch.kind === "byId") {
    const partial = patch.map[layer.id]

    return partial === undefined ? layer : /** @type {ResolvedLayer} */ (merge(layer, partial))
  }

  return /** @type {ResolvedLayer} */ (merge(layer, patch.body))
}

/**
 * Stamps `name` into the layer's `metadata.iml.style`.
 *
 * @param {ResolvedLayer} layer
 * @param {string | undefined} name
 * @returns {ResolvedLayer}
 */
const stampStyle = (layer, name) => ({
  ...layer,
  metadata: { ...layer.metadata, iml: { ...layer.metadata?.iml, style: name } },
})

/**
 * Merges two contexts. `source`/`source-layer` are last-wins; `filter`s AND
 * together.
 *
 * @param {LayerContext} prev
 * @param {LayerContext} next
 * @returns {LayerContext}
 */
const mergeContext = (prev, next) => {
  const merged = { ...prev, ...next }
  const filter = combineFilters(prev.filter, next.filter)

  if (filter !== undefined) {
    merged.filter = filter
  }

  return merged
}

/**
 * Merges two configs. `context` and `theme` shallow-merge; `patches` append in
 * order.
 *
 * @param {StyleConfig} config
 * @param {StyleConfig} next
 * @returns {StyleConfig}
 */
const mergeConfig = (config, next) => ({
  context: mergeContext(config.context ?? {}, next.context ?? {}),
  theme: { ...config.theme, ...next.theme },
  patches: [...(config.patches ?? []), ...(next.patches ?? [])],
})

/**
 * Accumulates {@link StyleConfig} through immutable `.apply`/`.theme`/`.patch`
 * calls, resolving to layers only at `.build`. Subclasses decide how the style
 * function's output becomes layers.
 *
 * @abstract
 */
export class Builder {
  /**
   * @param {string | undefined} name Stamped as `iml.style` on every built layer.
   * @param {StyleFn} fn
   * @param {StyleConfig} [config]
   */
  constructor(name, fn, config = {}) {
    this.name = name
    this.fn = fn
    this.config = config
  }

  /**
   * A new builder of the same kind carrying the merged config.
   *
   * @param {StyleConfig} next
   */
  withConfig(next) {
    return this.clone(mergeConfig(this.config, next))
  }

  /**
   * A new builder with `base` merged underneath its own config: the builder's own
   * fields win, unset ones fill from `base`, and its filters AND with `base`'s
   * first.
   *
   * @param {StyleConfig} base
   */
  inherit(base) {
    return this.clone(mergeConfig(base, this.config))
  }

  /**
   * @param {StyleConfig} config
   * @returns {this}
   */
  clone(config) {
    throw new Error("Builder.clone must be implemented by a subclass")
  }

  /**
   * Binds the layers to a source.
   *
   * @example
   * ```js
   * Ocean.apply({ source: "openmaptiles", sourceLayer: "water", filter: f.cls("ocean") })
   * ```
   *
   * @param {LayerContext} [context]
   * @returns {this}
   */
  apply(context = {}) {
    return this.withConfig({ context })
  }

  /**
   * Accumulates rendering preferences, merged over any already set.
   *
   * @param {Theme} theme
   * @returns {this}
   */
  theme(theme) {
    return this.withConfig({ theme })
  }

  /**
   * Accumulates a patch merged onto every built layer.
   *
   * @param {object} body
   * @returns {this}
   */
  patchAll(body) {
    return this.withConfig({ patches: [{ kind: "all", body }] })
  }

  /**
   * Accumulates a per-layer patch: a `(layer) => layer` transform applied to each
   * layer, or an `{ id: partial }` map merged onto the matching layers (others
   * untouched). Lets a style be reapplied under fresh ids without colliding.
   *
   * @example
   * ```js
   * Railway.patch((layer) => ({ ...layer, id: layer.id.replace("railway", "railway-transit") }))
   * Railway.patch({ railway: { id: "railway-transit" }, "railway-dash": { id: "railway-transit-dash" } })
   * ```
   *
   * @param {((layer: ResolvedLayer) => ResolvedLayer) | Record<string, object>} spec
   * @returns {this}
   */
  patch(spec) {
    const patch = typeof spec === "function" ? { kind: "each", fn: spec } : { kind: "byId", map: spec }

    return this.withConfig({ patches: [/** @type {Patch} */ (patch)] })
  }

  /**
   * Resolves the accumulated config to bound, patched, renamed layers, each
   * stamped with `iml.style`.
   *
   * @returns {ResolvedLayer[]}
   */
  build() {
    const context = this.config.context ?? {}
    const patches = this.config.patches ?? []

    return this.resolve(this.fn(this.config.theme ?? {}))
      .map((layer) => bindLayer(layer, context))
      .map((layer) => patches.reduce(applyPatch, layer))
      .map((layer) => stampStyle(layer, this.name))
  }

  /**
   * Selects which of the style function's layers to keep.
   *
   * @param {Style[]} layers
   */
  resolve(layers) {
    return /** @type {ResolvedLayer[]} */ (layers)
  }

  /**
   * The glyphs URL this style needs, or `undefined` if none of its layers render
   * text.
   */
  getGlyphsUrl() {
    return needsGlyphs(this.build()) ? GLYPHS_URL : undefined
  }

  /**
   * The sprite URL this style needs, or `undefined` if none of its layers render
   * an icon.
   */
  getSpriteUrl() {
    return needsSprite(this.build()) ? SPRITE_URL : undefined
  }
}

/**
 * A builder narrowed to one layer of a style, returned by
 * {@link StyleHandle#onlyLayer}.
 */
export class SingleLayerHandle extends Builder {
  /**
   * @param {string | undefined} name
   * @param {StyleFn} fn
   * @param {string} id
   * @param {StyleConfig} [config]
   */
  constructor(name, fn, id, config = {}) {
    super(name, fn, config)
    this.id = id
  }

  /** @param {StyleConfig} config */
  clone(config) {
    return /** @type {this} */ (new SingleLayerHandle(this.name, this.fn, this.id, config))
  }

  /** @param {Style[]} layers */
  resolve(layers) {
    const layer = layers.find((l) => l.id === this.id)

    if (layer === undefined) {
      throw new Error(`no layer with id "${this.id}" in this style`)
    }

    return [/** @type {ResolvedLayer} */ (layer)]
  }
}

/**
 * A builder for a style — a stack of one or more layers. Chain
 * `.apply`/`.theme`/`.patch`, then `.build` for its bound layers.
 */
export class StyleHandle extends Builder {
  /** @param {StyleConfig} config */
  clone(config) {
    return /** @type {this} */ (new StyleHandle(this.name, this.fn, config))
  }

  /**
   * Narrows to the single layer with the given id, preserving accumulated config.
   *
   * @param {string} id
   */
  onlyLayer(id) {
    return new SingleLayerHandle(this.name, this.fn, id, this.config)
  }

  /**
   * The style's raw, unbound layers. An escape hatch for introspection.
   *
   * @param {Theme} [theme]
   */
  layers(theme = {}) {
    return this.fn(theme)
  }
}

/**
 * Wraps a style function as a {@link StyleHandle}. By convention `name` matches
 * the export binding.
 *
 * @example
 * ```js
 * export const Ocean = style("Ocean", (theme) => [ ... ])
 * ```
 *
 * @param {string} name
 * @param {StyleFn} fn
 */
export const style = (name, fn) => new StyleHandle(name, fn)
