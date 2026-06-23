/** @import { Style } from "../../core/style.js" */
/**
 * A re-usable chunk of layer style — the public {@link Style} in its internal
 * authoring role. Traits are an authoring convenience for composing styles; they
 * are not part of the library's public surface.
 *
 * @typedef {Style} Trait
 */
/**
 * A function that produces a {@link Trait} from arguments, for styles
 * parameterised at the call site (zoom levels, theme, icon, etc.).
 *
 * @callback TraitFn
 * @param {...any} args
 * @returns {Trait}
 */
/**
 * Creates a zoom-interpolated `text-size` layout property.
 *
 * For example, `tSize({ 4: 10, 12: 14 })` returns:
 *
 * ```js
 * {
 *   layout: { "text-size": { stops: [[4, 10], [12, 14]] } }
 * }
 * ```
 *
 * @type {TraitFn}
 */
export const tSize: TraitFn;
export function tFade(prop: string, { in: fadeIn, out: fadeOut }?: {
    in?: FadeRange;
    out?: FadeRange;
}): Trait;
/**
 * Fades the given property *in* between the given zoom levels. Shorthand for
 * {@link tFade} with an `in` range; the default floor is 0.5.
 *
 * @type {TraitFn}
 */
export const tFadeIn: TraitFn;
/**
 * Fades the given property *out* between the given zoom levels. Shorthand for
 * {@link tFade} with an `out` range; the default floor is 0, so the element
 * disappears completely.
 *
 * @type {TraitFn}
 */
export const tFadeOut: TraitFn;
/**
 * Creates a `text-field` layout property from a property name or array of names.
 * Multiple names are coalesced in order; a pre-built expression array is passed through.
 *
 * @type {TraitFn}
 */
export const tTextField: TraitFn;
export function tSwap(stops: Record<number, Style>): Trait;
/**
 * A re-usable chunk of layer style — the public {@link Style} in its internal
 * authoring role. Traits are an authoring convenience for composing styles; they
 * are not part of the library's public surface.
 */
export type Trait = Style;
/**
 * A function that produces a {@link Trait} from arguments, for styles
 * parameterised at the call site (zoom levels, theme, icon, etc.).
 */
export type TraitFn = (...args: any[]) => Trait;
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
