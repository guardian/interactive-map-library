/**
 * Builds a zoom-interpolated style curve from zoom-to-value pairs. `base`
 * controls the interpolation curve: 1 (the default) is linear, other values
 * are exponential, ramping faster toward the high end as `base` rises above 1.
 *
 * @param {Record<number, any>} stops
 * @param {number} [base]
 */
export const zInterp = (stops, base) => {
  const curve = base === undefined ? {} : { base }

  curve.stops = Object.keys(stops)
    .map(Number)
    .sort((a, b) => a - b)
    .map((key) => [key, stops[key]])

  return curve
}

/**
 * Like {@link zInterp}, but emits a live `interpolate` expression that can be
 * nested inside other expressions (eg. deriving casing width from fill width).
 * Kept numerically identical to `zInterp`'s `{base, stops}` form.
 *
 * @param {Record<number, number>} stops
 * @param {number} [base]
 * @returns {unknown[]}
 */
export const zInterpExpr = (stops, base = 1) => {
  const pairs = Object.keys(stops)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((key) => [key, stops[key]])

  return ["interpolate", ["exponential", base], ["zoom"], ...pairs]
}

const asValue = (value) => {
  if (!Array.isArray(value)) {
    return value
  }

  if (value[0] === "literal") {
    return value
  }

  return ["literal", value]
}

/**
 * Builds a zoom `step` expression: `base` below the first stop, then each
 * stop's value at and above its zoom.
 *
 * @param {any} base
 * @param {Record<number, any>} stops
 */
export const zStep = (base, stops) => {
  const expr = ["step", ["zoom"], asValue(base)]

  Object.keys(stops)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((key) => expr.push(key, asValue(stops[key])))

  return expr
}
