import { Filter, seedsOf } from "./index.js"

/**
 * A `Filter` with verbs for the Protomaps schema, where feature type lives on
 * `kind`/`kind_detail` and tunnels/bridges are boolean `is_*` attributes.
 *
 * @example
 * ```js
 * new ProtomapsFilter().line().kind("highway").compile()
 * // ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "kind"], "highway"]]
 * ```
 */
export class ProtomapsFilter extends Filter {
  /** @param {...string} values */
  kind(...values) {
    return this.is("kind", ...values)
  }

  /** @param {...string} values */
  kindNot(...values) {
    return this.isNot("kind", ...values)
  }

  /** @param {...string} values */
  kindDetail(...values) {
    return this.is("kind_detail", ...values)
  }

  /** @param {...string} values */
  kindDetailNot(...values) {
    return this.isNot("kind_detail", ...values)
  }

  tunnel() {
    return this.has("is_tunnel")
  }

  notTunnel() {
    return this.hasNot("is_tunnel")
  }

  bridge() {
    return this.has("is_bridge")
  }

  notBridge() {
    return this.hasNot("is_bridge")
  }

  ramp() {
    return this.has("is_link")
  }

  notRamp() {
    return this.hasNot("is_link")
  }

  /** @param {number} value */
  minZoomLte(value) {
    return this.lte("min_zoom", value)
  }

  /** @param {number} value */
  minZoomGte(value) {
    return this.gte("min_zoom", value)
  }
}

/**
 * Entry points for building Protomaps filters, eg. `f.kind("highway")`.
 */
export const f = seedsOf(ProtomapsFilter)

export { any } from "./index.js"
