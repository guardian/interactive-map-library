import { describe, it, expect } from "vitest"
import { merge, style } from "../src/core/style.js"
import { Filter } from "../src/core/filter/index.js"

describe("merge", () => {
  it("deep-merges `paint` and `layout`, keeping keys from every part", () => {
    const merged = merge(
      { type: "line", paint: { "line-color": "red" }, layout: { "line-cap": "round" } },
      { paint: { "line-width": 2 }, layout: { "line-join": "round" } },
    )

    expect(merged).toEqual({
      type: "line",
      paint: { "line-color": "red", "line-width": 2 },
      layout: { "line-cap": "round", "line-join": "round" },
    })
  })

  it("is last-wins: later parts overwrite scalar keys and overlapping paint/layout props", () => {
    const merged = merge(
      { id: "a", minzoom: 4, paint: { "line-color": "red" } },
      { id: "b", paint: { "line-color": "blue" } },
    )

    expect(merged).toMatchObject({
      id: "b",
      minzoom: 4,
      paint: { "line-color": "blue" },
    })
  })

  it("does not mutate its input parts", () => {
    const base = { paint: { "line-color": "red" } }
    merge(base, { paint: { "line-width": 2 } })
    expect(base).toEqual({ paint: { "line-color": "red" } })
  })
})

// A plural style: an outline plus a fill, sharing a source and filter.
const Water = style(() => [
  merge({ id: "water-outline", type: "line", paint: { "line-color": "blue" } }),
  merge({ id: "water", type: "fill", paint: { "fill-color": "blue" } }),
])

// A single-layer style that echoes the resolved theme.
const Label = style((theme) => [{ id: "label", type: "symbol", theme }])

describe("style().apply", () => {
  it("returns every layer, binding source/source-layer/filter onto each", () => {
    const layers = Water.apply({
      source: "openmaptiles",
      sourceLayer: "water",
      filter: new Filter().polygon(),
    })

    expect(layers.map((l) => l.id)).toEqual(["water-outline", "water"])
    for (const layer of layers) {
      expect(layer).toMatchObject({
        source: "openmaptiles",
        "source-layer": "water",
        filter: ["==", ["geometry-type"], "Polygon"],
      })
    }
  })

  it("ANDs the context filter with a layer's own filter", () => {
    const Road = style(() => [
      { id: "road", type: "line", filter: new Filter().is("class", "primary") },
    ])

    const [road] = Road.apply({ filter: new Filter().line() })

    // The layer's own filter leads, with the context filter AND-ed onto it.
    expect(road.filter).toEqual([
      "all",
      ["==", ["get", "class"], "primary"],
      ["==", ["geometry-type"], "LineString"],
    ])
  })

  it("compiles a Filter and passes a raw expression through untouched", () => {
    expect(Label.apply({ filter: new Filter().point() })[0].filter).toEqual([
      "==",
      ["geometry-type"],
      "Point",
    ])
    expect(Label.apply({ filter: ["==", ["get", "x"], 1] })[0].filter).toEqual([
      "==",
      ["get", "x"],
      1,
    ])
  })

  it("omits filter when neither the layer nor the context sets one", () => {
    expect(Label.apply()[0]).not.toHaveProperty("filter")
  })

  it("passes the context theme to the style function", () => {
    expect(Label.apply({ theme: { textField: "name" } })[0].theme).toEqual({ textField: "name" })
  })

  it("injects `patch` as identity-property references into the named block", () => {
    const Extrusion = style(() => [{ id: "b", type: "fill-extrusion", paint: {} }])

    const [layer] = Extrusion.apply({
      patch: { paint: { "fill-extrusion-height": "render_height" } },
    })

    expect(layer.paint).toMatchObject({
      "fill-extrusion-height": { property: "render_height", type: "identity" },
    })
  })
})

describe("style().onlyLayer", () => {
  it("returns the single named layer, bound, not wrapped in an array", () => {
    const outline = Water.onlyLayer("water-outline").apply({
      source: "openmaptiles",
      sourceLayer: "water",
    })

    expect(outline).toMatchObject({
      id: "water-outline",
      source: "openmaptiles",
      "source-layer": "water",
    })
    expect(Array.isArray(outline)).toBe(false)
  })

  it("throws when the id is not present in the style", () => {
    expect(() => Water.onlyLayer("nope").apply()).toThrow()
  })
})

