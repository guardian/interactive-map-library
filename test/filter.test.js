import { describe, it, expect } from "vitest"
import { Filter, expr, any } from "../src/core/filter/index.js"
import { f as omt, OpenMapTilesFilter } from "../src/core/filter/openmaptiles.js"
import { f as pm, ProtomapsFilter } from "../src/core/filter/protomaps.js"

describe("Filter", () => {
  it("compiles an empty filter to undefined", () => {
    expect(new Filter().compile()).toBeUndefined()
  })

  it("unwraps a single predicate, and wraps several in a flat `all`", () => {
    expect(new Filter().line().compile()).toEqual(["==", ["geometry-type"], "LineString"])

    expect(new Filter().is("a", 1).is("b", 2).compile()).toEqual([
      "all",
      ["==", ["get", "a"], 1],
      ["==", ["get", "b"], 2],
    ])
  })

  it("picks operator by arity: `is`/`isNot` compare one value, test membership for many", () => {
    expect(new Filter().is("class", "ice").compile()).toEqual(["==", ["get", "class"], "ice"])
    expect(new Filter().is("class", "x", "y").compile()).toEqual([
      "in",
      ["get", "class"],
      ["literal", ["x", "y"]],
    ])

    expect(new Filter().isNot("class", "ice").compile()).toEqual(["!=", ["get", "class"], "ice"])
    expect(new Filter().isNot("class", "x", "y").compile()).toEqual([
      "!",
      ["in", ["get", "class"], ["literal", ["x", "y"]]],
    ])
  })

  it("is immutable: builder methods return a new filter rather than mutating", () => {
    const base = new Filter().point()
    const extended = base.is("class", "city")

    expect(base).not.toBe(extended)
    expect(base.compile()).toEqual(["==", ["geometry-type"], "Point"])
  })

  it("`and` merges another filter's predicates, and accepts a raw expression", () => {
    const combined = new Filter().point().and(new Filter().is("a", 1).is("b", 2))
    expect(combined.compile()).toEqual([
      "all",
      ["==", ["geometry-type"], "Point"],
      ["==", ["get", "a"], 1],
      ["==", ["get", "b"], 2],
    ])

    const withRaw = new Filter().point().and(["==", ["get", "x"], 1])
    expect(withRaw.compile()).toEqual([
      "all",
      ["==", ["geometry-type"], "Point"],
      ["==", ["get", "x"], 1],
    ])
  })

  it("AND-ing an empty filter is a no-op", () => {
    const base = new Filter().point()
    expect(base.and(new Filter()).compile()).toEqual(base.compile())
  })
})

describe("expr", () => {
  it("compiles a Filter, passes a raw expression through, and leaves undefined", () => {
    expect(expr(new Filter().point())).toEqual(["==", ["geometry-type"], "Point"])
    expect(expr(["==", ["get", "x"], 1])).toEqual(["==", ["get", "x"], 1])
    expect(expr(undefined)).toBeUndefined()
  })
})

describe("any", () => {
  it("wraps alternatives in a single `any`, compiling Filters and passing arrays through", () => {
    const combined = any(new Filter().is("a", 1), ["==", ["get", "b"], 2])
    expect(combined.compile()).toEqual(["any", ["==", ["get", "a"], 1], ["==", ["get", "b"], 2]])
  })
})

describe("schema-specific seeds", () => {
  it("`f` is a seed object whose methods start a fresh filter of the right class", () => {
    const filter = omt.cls("motorway")
    expect(filter).toBeInstanceOf(OpenMapTilesFilter)
    expect(filter.compile()).toEqual(["==", ["get", "class"], "motorway"])
  })

  it("preserves the concrete filter subtype when chaining, so schema verbs stay available", () => {
    // `.line()` lives on the base Filter; chaining must not downgrade the type.
    const chained = omt.line().cls("primary")
    expect(chained).toBeInstanceOf(OpenMapTilesFilter)
    expect(chained.compile()).toEqual([
      "all",
      ["==", ["geometry-type"], "LineString"],
      ["==", ["get", "class"], "primary"],
    ])
  })

  it("OpenMapTiles verbs read the OMT schema (class/brunnel/ramp)", () => {
    expect(omt.cls("motorway").compile()).toEqual(["==", ["get", "class"], "motorway"])
    expect(omt.tunnel().compile()).toEqual(["==", ["get", "brunnel"], "tunnel"])
    expect(omt.notRamp().compile()).toEqual(["!=", ["get", "ramp"], 1])
  })

  it("Protomaps verbs read the Protomaps schema (kind/is_tunnel/is_link)", () => {
    expect(pm.kind("highway").compile()).toEqual(["==", ["get", "kind"], "highway"])
    expect(pm.tunnel().compile()).toEqual(["has", "is_tunnel"])
    expect(pm.ramp().compile()).toEqual(["has", "is_link"])

    const road = pm.kind("major_road").kindDetail("secondary", "tertiary")
    expect(road).toBeInstanceOf(ProtomapsFilter)
    expect(road.compile()).toEqual([
      "all",
      ["==", ["get", "kind"], "major_road"],
      ["in", ["get", "kind_detail"], ["literal", ["secondary", "tertiary"]]],
    ])
  })
})
