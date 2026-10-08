/** @import { Style } from "../../core/style.js" */
/**
 * A re-usable chunk of layer style — the public {@link Style} in its internal
 * authoring role. Partials are an authoring convenience for composing styles;
 * they are not part of the library's public surface.
 *
 * @typedef {Style} Partial
 */
/**
 * A function that produces a {@link Partial} from arguments, for styles
 * parameterised at the call site (zoom levels, theme, icon, etc.).
 *
 * @callback PartialFn
 * @param {...any} args
 * @returns {Partial}
 */
/**
 * Creates a zoom-interpolated `text-size` layout property.
 *
 * For example, `pSize({ 4: 10, 12: 14 })` returns:
 *
 * ```js
 * {
 *   layout: { "text-size": { stops: [[4, 10], [12, 14]] } }
 * }
 * ```
 *
 * @type {PartialFn}
 */
export const pSize: PartialFn;
export function pFade(prop: string, { in: fadeIn, out: fadeOut }?: {
    in?: FadeRange;
    out?: FadeRange;
}): Partial;
/**
 * Fades the given property *in* between the given zoom levels. Shorthand for
 * {@link pFade} with an `in` range; the default floor is 0.5.
 *
 * @type {PartialFn}
 */
export const pFadeIn: PartialFn;
/**
 * Fades the given property *out* between the given zoom levels. Shorthand for
 * {@link pFade} with an `out` range; the default floor is 0, so the element
 * disappears completely.
 *
 * @type {PartialFn}
 */
export const pFadeOut: PartialFn;
/**
 * Creates a `text-field` layout property from a property name or array of names.
 * Multiple names are coalesced in order; a pre-built expression array is passed through.
 *
 * @type {PartialFn}
 */
export const pTextField: PartialFn;
export function pSwap(stops: Record<number, Style>): Partial;
/**
 * A re-usable chunk of layer style — the public {@link Style} in its internal
 * authoring role. Partials are an authoring convenience for composing styles;
 * they are not part of the library's public surface.
 */
export type Partial = Style;
/**
 * A function that produces a {@link Partial} from arguments, for styles
 * parameterised at the call site (zoom levels, theme, icon, etc.).
 */
export type PartialFn = (...args: any[]) => Partial;
/**
 * A fade range: the two zoom levels to fade across, plus an optional config
 * object. `min`/`max` set the ramp's floor and ceiling, `base` its curve.
 */
export type FadeRange = [number, number, {
    min?: number;
    max?: number;
    base?: number;
}?];
import type { Style } from "../../core/style.js";
