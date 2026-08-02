import { zInterp, zStep } from "./zoom.js"

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
export const pSize = (stops, base) => ({
  layout: { "text-size": zInterp(stops, base) },
})

/**
 * A fade range: the two zoom levels to fade across, plus an optional config
 * object. `min`/`max` set the ramp's floor and ceiling, `base` its curve.
 *
 * @typedef {[number, number, { min?: number, max?: number, base?: number }?]} FadeRange
 */

/**
 * Creates an opacity ramp for the given property, fading it in and/or out
 * across zoom. `in` ramps up from its `min` to its `max`; `out` ramps back down
 * to its `min`. Giving both emits a single ramp holding at the `in` range's
 * `max` between them, since one property can carry only one ramp.
 *
 * Each range is `[from, to]` with an optional config object, so the two sides
 * can floor at different opacities (typically in→0.5, out→0). `minzoom`/
 * `maxzoom` are clamped to the outer edges of the fade, below and above which
 * the element is invisible. When "text-opacity" is given, an identical
 * "icon-opacity" ramp is emitted also.
 *
 * For example, `pFade("fill-opacity", { in: [5, 9], out: [10, 12] })` fades in
 * over 5→9, holds, then out over 10→12, with `minzoom: 5` and `maxzoom: 12`.
 *
 * @param {string} prop
 * @param {{ in?: FadeRange, out?: FadeRange }} config
 * @returns {Partial}
 */
export const pFade = (prop, { in: fadeIn, out: fadeOut } = {}) => {
  /** @type {Record<number, number>} */
  const stops = {}
  /** @type {Partial} */
  const bounds = {}
  let base

  if (fadeIn !== undefined) {
    const [from, to, { min = 0.5, max = 1, base: inBase } = {}] = fadeIn
    stops[from] = min
    stops[to] = max
    bounds.minzoom = from
    base = inBase
  }

  if (fadeOut !== undefined) {
    const [from, to, { min = 0, max = 1, base: outBase } = {}] = fadeOut
    stops[from] = max
    stops[to] = min
    bounds.maxzoom = to
    base = base ?? outBase
  }

  const paint = { [prop]: zInterp(stops, base) }

  if (prop === "text-opacity") {
    paint["icon-opacity"] = zInterp(stops, base)
  }

  return { ...bounds, paint }
}

/**
 * Fades the given property *in* between the given zoom levels. Shorthand for
 * {@link pFade} with an `in` range; the default floor is 0.5.
 *
 * @type {PartialFn}
 */
export const pFadeIn = (prop, from, to, opts = {}) =>
  pFade(prop, { in: [from, to, { min: 0.5, ...opts }] })

/**
 * Fades the given property *out* between the given zoom levels. Shorthand for
 * {@link pFade} with an `out` range; the default floor is 0, so the element
 * disappears completely.
 *
 * @type {PartialFn}
 */
export const pFadeOut = (prop, from, to, opts = {}) =>
  pFade(prop, { out: [from, to, { min: 0, ...opts }] })

/**
 * Creates a `text-field` layout property from a property name or array of names.
 * Multiple names are coalesced in order; a pre-built expression array is passed through.
 *
 * @type {PartialFn}
 */
export const pTextField = (textField) => {
  if (textField === undefined) {
    return {}
  }

  let resolvedField = textField

  if (typeof textField === "string" && !textField.includes("{")) {
    resolvedField = ["get", textField]
  }

  if (Array.isArray(textField) && textField.every((f) => typeof f === "string")) {
    resolvedField = ["coalesce", ...textField.map((name) => ["get", name])]
  }

  return {
    layout: { "text-field": resolvedField },
  }
}

/**
 * Swaps whole partials by zoom, hard-stepping at each band's zoom. Given
 * `{ zoom: partial }` stops, every `layout`/`paint` property appearing in any
 * band becomes a `zStep` selecting that band's value (or `undefined` where a
 * band omits it) at and above the band's zoom. Static keys like `type` are
 * taken as-is from whichever band sets them last.
 *
 * Bands are expected to be complete partials, so a property present in one band
 * and absent in another genuinely means "unset there" rather than "inherit".
 *
 * @example
 * ```js
 * pSwap({ 0: pTypography("regularSans"), 14: pTypography("boldSans") })
 * // regularSans below z14, boldSans at/above, stepping each property.
 * ```
 *
 * @param {Record<number, Style>} stops
 * @returns {Partial}
 */
export const pSwap = (stops) => {
  const bands = Object.keys(stops)
    .map(Number)
    .sort((a, b) => a - b)
    .map((zoom) => ({ zoom, partial: stops[zoom] }))

  /** @type {Partial} */
  const swapped = {}

  for (const block of ["layout", "paint"]) {
    /** @type {Set<string>} */
    const props = new Set()

    for (const { partial } of bands) {
      Object.keys(partial[block] ?? {}).forEach((prop) => props.add(prop))
    }

    if (props.size === 0) {
      continue
    }

    swapped[block] = {}

    for (const prop of props) {
      // Array values (eg. a `text-font` like `["Font Name"]`) read as an
      // expression when dropped straight into a `step`, their first element
      // parsed as a bogus function name — so wrap them as literals.
      const valueAt = (band) => {
        const value = band.partial[block]?.[prop]
        return Array.isArray(value) ? ["literal", value] : value
      }

      const steps = {}
      bands.slice(1).forEach((band) => {
        steps[band.zoom] = valueAt(band)
      })

      swapped[block][prop] = zStep(valueAt(bands[0]), steps)
    }
  }

  // Static keys (eg. `type`) aren't zoom-varying; last band to set one wins.
  for (const { partial } of bands) {
    for (const [key, value] of Object.entries(partial)) {
      if (key === "layout" || key === "paint") {
        continue
      }

      swapped[key] = value
    }
  }

  return swapped
}
