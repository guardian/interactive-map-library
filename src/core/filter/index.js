/**
 * A MapLibre GL expression array, eg. `["==", ["get", "class"], "river"]`.
 *
 * @typedef {unknown[]} Expression
 */

/**
 * A chainable builder for GL filter expressions. Each method returns a new
 * `Filter` (never mutating), so filters can be shared and extended freely.
 *
 * @example
 * ```js
 * new Filter().line().is("class", "primary").compile()
 * // ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "class"], "primary"]]
 * ```
 */
export class Filter {
  /** @param {Expression[]} predicates */
  constructor(predicates = []) {
    this.predicates = predicates
  }

  /** @param {Expression} predicate */
  add(predicate) {
    const Class = /** @type {new (predicates: Expression[]) => this} */ (this.constructor)
    return new Class([...this.predicates, predicate])
  }

  point() {
    return this.add(["==", ["geometry-type"], "Point"])
  }

  line() {
    return this.add(["==", ["geometry-type"], "LineString"])
  }

  polygon() {
    return this.add(["==", ["geometry-type"], "Polygon"])
  }

  /**
   * @param {string} key
   * @param {...(string|number)} values
   */
  is(key, ...values) {
    if (values.length === 1) {
      return this.add(["==", ["get", key], values[0]])
    }

    return this.add(["in", ["get", key], ["literal", values]])
  }

  /**
   * @param {string} key
   * @param {...(string|number)} values
   */
  isNot(key, ...values) {
    if (values.length === 1) {
      return this.add(["!=", ["get", key], values[0]])
    }

    return this.add(["!", ["in", ["get", key], ["literal", values]]])
  }

  /**
   * @param {string} key
   * @param {number} value
   */
  gte(key, value) {
    return this.add(["all", ["has", key], [">=", ["get", key], value]])
  }

  /**
   * @param {string} key
   * @param {number} value
   */
  lte(key, value) {
    return this.add(["all", ["has", key], ["<=", ["get", key], value]])
  }

  /** @param {string} key */
  has(key) {
    return this.add(["has", key])
  }

  /** @param {string} key */
  hasNot(key) {
    return this.add(["!", ["has", key]])
  }

  /** @param {Filter|Expression} expression */
  where(expression) {
    const predicate = expr(expression)

    if (predicate === undefined) {
      return this
    }

    return this.add(predicate)
  }

  /** @param {Filter|Expression} other */
  and(other) {
    // A Filter contributes its predicates directly (an empty one is a no-op);
    // a raw array is a single predicate. Neither branch can be `undefined`.
    let predicates

    if (other instanceof Filter) {
      predicates = other.predicates
    } else {
      predicates = [other]
    }

    return predicates.reduce((filter, predicate) => filter.add(predicate), this)
  }

  /** @returns {Expression|undefined} */
  compile() {
    if (this.predicates.length === 0) {
      return undefined
    }

    if (this.predicates.length === 1) {
      return this.predicates[0]
    }

    return ["all", ...this.predicates]
  }
}

// The single point that coerces anything filter-shaped into an optional GL
// expression: a Filter builder is compiled (an empty one yielding `undefined`),
// a raw array passes through, and `undefined` stays `undefined`. Callers that
// know they hold a real filter (`where`, `and`) never see the empty case; the
// one caller that accepts an absent filter (`makeLayer`) relies on it.
/**
 * @param {Filter|Expression} [value]
 * @returns {Expression|undefined}
 */
export const expr = (value) => (value instanceof Filter ? value.compile() : value)

/**
 * Builds a bare object of entry-point functions, one per filter method, each
 * starting a fresh filter of the given class. Lets call sites read as
 * `f.cls("motorway")` instead of `new OpenMapTilesFilter().cls("motorway")`.
 *
 * @example
 * ```js
 * const f = seedsOf(OpenMapTilesFilter)
 * f.line().cls("primary") // same as new OpenMapTilesFilter().line().cls("primary")
 * ```
 *
 * @template {new (...args: any[]) => Filter} C
 * @param {C} Class
 */
export const seedsOf = (Class) => {
  const internals = new Set(["constructor", "add", "and", "compile"])

  /** @type {Record<string, (...args: any[]) => Filter>} */
  const seeds = {}

  let proto = Class.prototype

  while (proto && proto !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (internals.has(name) || name in seeds) {
        continue
      }

      // @ts-ignore
      seeds[name] = (...args) => new Class()[name](...args)
    }
    proto = Object.getPrototypeOf(proto)
  }

  return /** @type {InstanceType<C>} */ (seeds)
}

/**
 * OR-s its alternatives into a single filter, complementing `Filter`'s
 * AND-by-default chaining.
 *
 * @example
 * ```js
 * any(f.cls("trunk"), f.is("network", "us-state"))
 * // ["any", ["==", ["get", "class"], "trunk"], ["==", ["get", "network"], "us-state"]]
 * ```
 *
 * @param {...(Filter|unknown[])} alternatives
 */
export const any = (...alternatives) => new Filter([["any", ...alternatives.map(expr)]])
