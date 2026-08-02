import { Filter, expr } from "../filter/index.js"
import { GLYPHS_URL, SPRITE_URL, needsGlyphs, needsSprite } from "./resources.js"

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
 * A function producing the `Style`s of a style's layers from a resolved
 * `Theme`. Wrapped by {@link style} to make the style itself the entrypoint.
 *
 * @callback StyleFn
 * @param {Theme} theme
 * @returns {Style[]}
 */

/**
 * The context binding a style's layers to a source: its address into the tiles.
 * Passed to `.apply` as plain data and accumulated on the builder; theme and
 * patches are set through their own methods.
 *
 * @typedef {object} LayerContext
 * @property {string} [source] The layers' "source" property
 * @property {string} [sourceLayer] The layers' "source-layer" property
 * @property {import("../filter/index.js").Filter | any[]} [filter] AND-ed with each layer's own filter
 */

/**
 * The accumulated configuration a builder carries until `.build()` resolves it.
 *
 * @typedef {object} StyleConfig
 * @property {LayerContext} [context]
 * @property {Theme} [theme]
 * @property {object[]} [patches] Applied verbatim to every built layer, in order
 * @property {IdRename[]} [renames] Rewrite built layer ids, in order
 */

/**
 * How to rewrite built layer ids: a function `(id) => newId`, or a lookup object
 * mapping old id to new id (ids absent from the map are left unchanged).
 *
 * @typedef {((id: string) => string) | Record<string, string>} IdRename
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
 * Binds a single built layer to a source, stamping the context's `source`,
 * `source-layer` and `filter` onto it. The layer's own filter (if any) is AND-ed
 * with the context filter, so a shared filter cannot drift between the layers of
 * one style.
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
 * Merges one patch onto a built layer, verbatim. Nested `layout`/`paint` blocks
 * shallow-merge; everything else overwrites. To bind a property to a feature
 * attribute, write the GL form explicitly, eg.
 * `patch({ paint: { "fill-extrusion-height": { property: "render_height", type: "identity" } } })`.
 *
 * @param {ResolvedLayer} layer
 * @param {object} patch
 * @returns {ResolvedLayer}
 */
const applyPatch = (layer, patch) => /** @type {ResolvedLayer} */ (merge(layer, patch))

/**
 * Rewrites a built layer's id. A function is applied to the id; an object is a
 * lookup where a missing key leaves the id unchanged.
 *
 * @param {ResolvedLayer} layer
 * @param {IdRename} rename
 * @returns {ResolvedLayer}
 */
const applyRename = (layer, rename) => {
  const id = typeof rename === "function" ? rename(layer.id) : rename[layer.id] ?? layer.id

  return { ...layer, id }
}

/**
 * Stamps a built layer's provenance `style` name into `metadata.iml`, preserving
 * any existing metadata. A nameless style leaves `iml.style` undefined.
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
 * Merges a new context onto an accumulated one. `source`/`source-layer` are
 * last-wins; `filter`s AND together so repeated `.apply` calls narrow rather
 * than clobber.
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
 * Merges accumulated config from a builder with a new fragment. `context` and
 * `theme` shallow-merge (filters AND); `patches` append in order.
 *
 * @param {StyleConfig} config
 * @param {StyleConfig} next
 * @returns {StyleConfig}
 */
const mergeConfig = (config, next) => ({
  context: mergeContext(config.context ?? {}, next.context ?? {}),
  theme: { ...config.theme, ...next.theme },
  patches: [...(config.patches ?? []), ...(next.patches ?? [])],
  renames: [...(config.renames ?? []), ...(next.renames ?? [])],
})

/**
 * The shared builder body: accumulates {@link StyleConfig} through immutable
 * `.apply`/`.theme`/`.patch` calls, resolving to layers only at `.build`.
 * Subclasses supply how the style function's output becomes layers.
 *
 * @abstract
 */
export class Builder {
  /**
   * @param {string | undefined} name The style name, stamped as `iml.style` on
   *   every built layer. `undefined` for a nameless ad-hoc style.
   * @param {StyleFn} fn
   * @param {StyleConfig} [config]
   */
  constructor(name, fn, config = {}) {
    this.name = name
    this.fn = fn
    this.config = config
  }

  /**
   * Returns a new builder of the same kind carrying the merged config. Each
   * subclass implements {@link clone} so its extra fields (eg. a selected layer
   * id) survive the copy.
   *
   * @param {StyleConfig} next
   * @returns {this}
   */
  withConfig(next) {
    return this.clone(mergeConfig(this.config, next))
  }

  /**
   * Returns a new builder with `base` merged *underneath* this builder's own
   * config: the builder's own `source`/`source-layer`/`theme` win, unset fields
   * fill from `base`, and filters AND with `base`'s first. This is the
   * inheritance a group applies when pushing its `theme`/source-binding down to a
   * child that hasn't set its own.
   *
   * @param {StyleConfig} base
   * @returns {this}
   */
  inherit(base) {
    return this.clone(mergeConfig(base, this.config))
  }

  /**
   * @abstract
   * @param {StyleConfig} config
   * @returns {this}
   */
  clone(config) {
    throw new Error("Builder.clone must be implemented by a subclass")
  }

  /**
   * Accumulates source-binding context (`source`/`source-layer`/`filter`).
   *
   * @param {LayerContext} [context]
   * @returns {this}
   */
  apply(context = {}) {
    return this.withConfig({ context })
  }

  /**
   * Accumulates rendering preferences, shallow-merged over any already set.
   *
   * @param {Theme} theme
   * @returns {this}
   */
  theme(theme) {
    return this.withConfig({ theme })
  }

  /**
   * Accumulates a verbatim patch applied to every built layer at `.build`.
   *
   * @param {object} patch
   * @returns {this}
   */
  patch(patch) {
    return this.withConfig({ patches: [patch] })
  }

  /**
   * Accumulates an id rewrite applied to every built layer at `.build`, after
   * patches. Lets a style be reapplied without its ids colliding, eg.
   * `Railway.renameIds((id) => id.replace("railway", "railway-transit"))` or
   * `Railway.renameIds({ railway: "railway-transit" })`.
   *
   * @param {IdRename} rename
   * @returns {this}
   */
  renameIds(rename) {
    return this.withConfig({ renames: [rename] })
  }

  /**
   * Resolves the accumulated config to bound, patched, renamed layers, each
   * stamped with `iml.style`. A group walk adds `iml.group` on top of this.
   *
   * @returns {ResolvedLayer[]}
   */
  build() {
    const context = this.config.context ?? {}
    const patches = this.config.patches ?? []
    const renames = this.config.renames ?? []

    return this.resolve(this.fn(this.config.theme ?? {}))
      .map((layer) => bindLayer(layer, context))
      .map((layer) => patches.reduce(applyPatch, layer))
      .map((layer) => renames.reduce(applyRename, layer))
      .map((layer) => stampStyle(layer, this.name))
  }

  /**
   * Selects the produced layers from the style function's raw output. Overridden
   * by {@link SingleLayerHandle} to pick one.
   *
   * @param {Style[]} layers
   * @returns {ResolvedLayer[]}
   */
  resolve(layers) {
    return /** @type {ResolvedLayer[]} */ (layers)
  }

  /**
   * The glyphs URL this style needs, or `undefined` if none of its layers render
   * text. Glyphs are a fixed library constant a text style is authored against.
   *
   * @returns {string | undefined}
   */
  getGlyphsUrl() {
    return needsGlyphs(this.build()) ? GLYPHS_URL : undefined
  }

  /**
   * The sprite URL this style needs, or `undefined` if none of its layers render
   * an icon.
   *
   * @returns {string | undefined}
   */
  getSpriteUrl() {
    return needsSprite(this.build()) ? SPRITE_URL : undefined
  }
}

/**
 * A builder for a single named layer within a style, returned by
 * {@link StyleHandle.onlyLayer}. `.build` resolves to that one layer.
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
 * A builder for a style: a stack of one or more layers. The entrypoint for using
 * a style — you import it, chain `.apply`/`.theme`/`.patch`, and `.build` to get
 * its bound layers.
 */
export class StyleHandle extends Builder {
  /** @param {StyleConfig} config */
  clone(config) {
    return /** @type {this} */ (new StyleHandle(this.name, this.fn, config))
  }

  /**
   * Selects the single layer with the given id, returning a builder whose
   * `.build` yields that one layer while preserving accumulated config.
   *
   * @param {string} id
   */
  onlyLayer(id) {
    return new SingleLayerHandle(this.name, this.fn, id, this.config)
  }

  /**
   * The style's raw, unbound layers. An escape hatch for introspection; most
   * code uses `.build`.
   *
   * @param {Theme} [theme]
   */
  layers(theme = {}) {
    return this.fn(theme)
  }
}

/**
 * Wraps a style function as a {@link StyleHandle}, making the style itself the
 * entrypoint: `Ocean.apply(...).build()` builds and binds its layers. The `name`
 * is stamped as `iml.style` on every layer it produces and, by convention, must
 * match the export binding (`export const Ocean = style("Ocean", …)`).
 *
 * @param {string} name
 * @param {StyleFn} fn
 */
export const style = (name, fn) => new StyleHandle(name, fn)
