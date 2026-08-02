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
    kind(...values: string[]): this;
    /** @param {...string} values */
    kindNot(...values: string[]): this;
    /** @param {...string} values */
    kindDetail(...values: string[]): this;
    /** @param {...string} values */
    kindDetailNot(...values: string[]): this;
    tunnel(): this;
    notTunnel(): this;
    bridge(): this;
    notBridge(): this;
    ramp(): this;
    notRamp(): this;
    /** @param {number} value */
    minZoomLte(value: number): this;
    /** @param {number} value */
    minZoomGte(value: number): this;
}
/**
 * Entry points for building Protomaps filters, eg. `f.kind("highway")`.
 */
export const f: ProtomapsFilter;
export { any } from "./index.js";
import { Filter } from "./index.js";
