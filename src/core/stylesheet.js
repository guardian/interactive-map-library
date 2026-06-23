import { group as makeGroup, mergeParams } from "./layer.js"

/**
 * @import { ResolvedLayer, StyleFn } from "./style.js"
 */

/**
 * Rendering preferences a `StyleFn` reads to shape its output, resolved
 * most-specific-wins across `defaults` → `group` → layer.
 *
 * @typedef {object} Theme
 * @property {string | string[]} [textField]
 */

/**
 * The parameters for a layer: its address into the tiles plus theme and
 * assembly overrides. Shared by `defaults`, `group`, and each layer.
 *
 * @typedef {object} LayerParams
 * @property {string} [source] The layer's "source" property
 * @property {string} [sourceLayer] The layer's "source-layer" property
 * @property {import("./filter/index.js").Filter | any[]} [filter] The layer's "filter" property
 * @property {object} [patch] Overrides layer properties with values read verbatim from a feature
 * attribute, keyed by block then property, eg. `patch: { paint: { "fill-extrusion-height": "render_height" } }`
 * @property {Theme} [theme] Rendering preferences for the given style
 * @property {string} [id] The layer's "id" property, overriding the default from the given style
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
 * Wrapper around a complete GL style document.
 */
export class Stylesheet {
  /** @private */
  furniture

  /** @private */
  baseline = {}

  /**
   * @private
   * @type {ResolvedLayer[]}
   */
  layers = []

  /** @param {Furniture} furniture */
  constructor(furniture = {}) {
    this.furniture = furniture

    // Binding member functions like this lets us destructure them, ie.
    // `const { layer, build } = new Stylesheet(...)`.
    this.defaults = this.defaults.bind(this)
    this.group = this.group.bind(this)
    this.layer = this.layer.bind(this)
    this.build = this.build.bind(this)
  }

  /**
   * @private
   * @param {ReturnType<typeof makeGroup>} freeGroup
   */
  sink(freeGroup) {
    const sink = {
      /** @param {LayerParams} [params] */
      group: (params = {}) => this.sink(freeGroup.group(params)),

      /**
       * @param {StyleFn} style
       * @param {LayerParams} [params]
       */
      layer: (style, params = {}) => {
        const layer = freeGroup.layer(style, params)
        this.layers.push(layer)
        return layer
      },

      /** @param {(layer: typeof sink.layer, group: typeof sink) => void} fn */
      within: (fn) => {
        /** @type {ResolvedLayer[]} */
        const layers = []

        /**
         * @param {StyleFn} style
         * @param {LayerParams} [params]
         */
        const collect = (style, params = {}) => {
          const layer = sink.layer(style, params)
          layers.push(layer)
          return layer
        }

        fn(collect, sink)

        return layers
      },
    }
    return sink
  }

  /** @param {LayerParams} params */
  defaults(params = {}) {
    this.baseline = mergeParams(this.baseline, params)
  }

  /** @param {LayerParams} groupParams */
  group(groupParams = {}) {
    return this.sink(makeGroup(mergeParams(this.baseline, groupParams)))
  }

  /**
   * @param {StyleFn} style
   * @param {LayerParams} params
   */
  layer(style, params = {}) {
    return this.sink(makeGroup(this.baseline)).layer(style, params)
  }

  build() {
    const { sources, glyphs, sprite, name, metadata, version } = this.furniture

    return {
      version: version ?? 8,
      ...(name !== undefined && { name }),
      ...(glyphs !== undefined && { glyphs }),
      ...(sprite !== undefined && { sprite }),
      ...(metadata !== undefined && { metadata }),
      ...(sources !== undefined && { sources }),
      layers: [...this.layers],
    }
  }
}
