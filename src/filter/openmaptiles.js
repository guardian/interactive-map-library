import { Filter, seedsOf } from "./index.js"

/**
 * A `Filter` with verbs for the OpenMapTiles schema, where feature type lives on
 * `class` and tunnels/bridges on `brunnel`.
 *
 * @example
 * ```js
 * new OpenMapTilesFilter().line().cls("motorway").compile()
 * // ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "class"], "motorway"]]
 * ```
 */
export class OpenMapTilesFilter extends Filter {
  /** @param {...string} values */
  cls(...values) {
    return this.is("class", ...values)
  }

  /** @param {...string} values */
  clsNot(...values) {
    return this.isNot("class", ...values)
  }

  tunnel() {
    return this.is("brunnel", "tunnel")
  }

  bridge() {
    return this.is("brunnel", "bridge")
  }

  notTunnel() {
    return this.isNot("brunnel", "tunnel")
  }

  ramp() {
    return this.is("ramp", 1)
  }

  notRamp() {
    return this.isNot("ramp", 1)
  }
}

/**
 * Entry points for building OpenMapTiles filters, eg. `f.cls("motorway")`.
 */
export const f = seedsOf(OpenMapTilesFilter)

export { any } from "./index.js"
