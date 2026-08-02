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
    cls(...values: string[]): this;
    /** @param {...string} values */
    clsNot(...values: string[]): this;
    tunnel(): this;
    bridge(): this;
    notTunnel(): this;
    ramp(): this;
    notRamp(): this;
}
/**
 * Entry points for building OpenMapTiles filters, eg. `f.cls("motorway")`.
 */
export const f: OpenMapTilesFilter;
export { any } from "./index.js";
import { Filter } from "./index.js";
