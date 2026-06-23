import { describe, it, expect } from "vitest"
import { layer, group, makeLayer, mergeParams } from "../src/core/layer.js"
import { Filter } from "../src/core/filter/index.js"

// A minimal style function: echoes the resolved theme so we can observe what
// reached it, and carries a default id/paint like a real style would.
const EgStyle = (theme) => ({ id: "style", type: "line", paint: { "line-color": "red" }, theme })

describe("makeLayer", () => {
  it("invokes the style with the theme and binds source/source-layer/filter", () => {
    const result = layer(EgStyle, {
      source: "openmaptiles",
      sourceLayer: "water",
      filter: new Filter().polygon(),
      theme: { textField: "name" },
    })

    expect(result).toMatchObject({
      id: "style",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      filter: ["==", ["geometry-type"], "Polygon"],
      theme: { textField: "name" },
    })
  })

  it("compiles a Filter to a GL expression and passes a raw array through untouched", () => {
    expect(layer(EgStyle, { filter: new Filter().point() }).filter).toEqual([
      "==",
      ["geometry-type"],
      "Point",
    ])
    expect(layer(EgStyle, { filter: ["==", ["get", "x"], 1] }).filter).toEqual([
      "==",
      ["get", "x"],
      1,
    ])
  })

  it("omits filter entirely when none is given", () => {
    expect(layer(EgStyle)).not.toHaveProperty("filter")
  })

  it("lets `id` override the style's default", () => {
    expect(layer(EgStyle, { id: "custom" }).id).toBe("custom")
  })

  it("injects `patch` as identity-property references into the named block", () => {
    const result = layer(EgStyle, {
      patch: { paint: { "fill-extrusion-height": "render_height" } },
    })
    expect(result.paint).toMatchObject({
      "fill-extrusion-height": { property: "render_height", type: "identity" },
    })
  })

  it("rejects an already-invoked style object", () => {
    expect(() => layer(EgStyle())).toThrow(TypeError)
  })
})

describe("mergeParams", () => {
  it("overwrites binding keys, merges theme one level deep, and ANDs filters", () => {
    const merged = mergeParams(
      { source: "a", theme: { textField: "name", other: 1 }, filter: new Filter().polygon() },
      { source: "b", theme: { textField: "name:en" }, filter: new Filter().is("class", "ice") },
    )

    expect(merged.source).toBe("b")
    expect(merged.theme).toEqual({ textField: "name:en", other: 1 })
    expect(merged.filter.compile()).toEqual([
      "all",
      ["==", ["geometry-type"], "Polygon"],
      ["==", ["get", "class"], "ice"],
    ])
  })

  it("merges `patch` within a block, keeping the parent's other properties", () => {
    const merged = mergeParams(
      { patch: { paint: { "fill-extrusion-height": "height" } } },
      { patch: { paint: { "fill-extrusion-base": "min_height" } } },
    )

    expect(merged.patch).toEqual({
      paint: {
        "fill-extrusion-height": "height",
        "fill-extrusion-base": "min_height",
      },
    })
  })
})

describe("group", () => {
  it("forwards its config to layers created through it", () => {
    const g = group({ source: "openmaptiles", sourceLayer: "water" })
    const result = g.layer(EgStyle)

    expect(result).toMatchObject({
      source: "openmaptiles",
      "source-layer": "water",
    })
  })

  it("ANDs the group filter with the layer filter", () => {
    const g = group({ filter: new Filter().polygon() })
    const result = g.layer(EgStyle, { filter: new Filter().is("class", "ice") })

    expect(result.filter).toEqual([
      "all",
      ["==", ["geometry-type"], "Polygon"],
      ["==", ["get", "class"], "ice"],
    ])
  })

  it("lets a layer override an inherited binding key while keeping the rest", () => {
    const g = group({ source: "openmaptiles", sourceLayer: "water" })
    const result = g.layer(EgStyle, { sourceLayer: "waterway" })

    expect(result).toMatchObject({
      source: "openmaptiles",
      "source-layer": "waterway",
    })
  })

  it("cascades config through nested groups down to the layer", () => {
    const outer = group({ source: "openmaptiles", theme: { textField: "name" } })
    const inner = outer.group({ sourceLayer: "transportation", filter: new Filter().line() })
    const result = inner.layer(EgStyle, { filter: new Filter().is("class", "minor") })

    expect(result).toMatchObject({
      source: "openmaptiles",
      "source-layer": "transportation",
      theme: { textField: "name" },
    })
    expect(result.filter).toEqual([
      "all",
      ["==", ["geometry-type"], "LineString"],
      ["==", ["get", "class"], "minor"],
    ])
  })

  it("does not leak one nested group's config into a sibling", () => {
    const outer = group({ source: "openmaptiles" })
    const water = outer.group({ sourceLayer: "water" })
    const roads = outer.group({ sourceLayer: "roads" })

    expect(water.layer(EgStyle)["source-layer"]).toBe("water")
    expect(roads.layer(EgStyle)["source-layer"]).toBe("roads")
  })

  it("`within` collects and returns every layer defined in the callback, sharing group config", () => {
    const g = group({ source: "openmaptiles", sourceLayer: "water" })

    const layers = g.within((layer) => {
      layer(EgStyle, { id: "a" })
      layer(EgStyle, { id: "b" })
    })

    expect(layers.map((l) => l.id)).toEqual(["a", "b"])
    for (const l of layers) {
      expect(l).toMatchObject({ source: "openmaptiles", "source-layer": "water" })
    }
  })
})
