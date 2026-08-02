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
    constructor(predicates?: Expression[]);
    predicates: Expression[];
    /** @param {Expression} predicate */
    add(predicate: Expression): this;
    point(): this;
    line(): this;
    polygon(): this;
    /**
     * @param {string} key
     * @param {...(string|number)} values
     */
    is(key: string, ...values: (string | number)[]): this;
    /**
     * @param {string} key
     * @param {...(string|number)} values
     */
    isNot(key: string, ...values: (string | number)[]): this;
    /**
     * @param {string} key
     * @param {number} value
     */
    gte(key: string, value: number): this;
    /**
     * @param {string} key
     * @param {number} value
     */
    lte(key: string, value: number): this;
    /** @param {string} key */
    has(key: string): this;
    /** @param {string} key */
    hasNot(key: string): this;
    /** @param {Filter|Expression} expression */
    where(expression: Filter | Expression): this;
    /** @param {Filter|Expression} other */
    and(other: Filter | Expression): this;
    /** @returns {Expression|undefined} */
    compile(): Expression | undefined;
}
export function expr(value?: Filter | Expression): Expression | undefined;
export function seedsOf<C extends new (...args: any[]) => Filter>(Class: C): InstanceType<C>;
export function any(...alternatives: (Filter | unknown[])[]): Filter;
/**
 * A MapLibre GL expression array, eg. `["==", ["get", "class"], "river"]`.
 */
export type Expression = unknown[];
