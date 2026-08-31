import { describe, it, expect } from "vitest"
import { merge, style } from "../src/core/style.js"
import { Filter } from "../src/filter/index.js"

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
const Water = style("Water", () => [
  merge({ id: "water-outline", type: "line", paint: { "line-color": "blue" } }),
  merge({ id: "water", type: "fill", paint: { "fill-color": "blue" } }),
])

// A single-layer style that echoes the resolved theme.
const Label = style("Label", (theme) => [{ id: "label", type: "symbol", theme }])

describe("style builder", () => {
  it("builds every layer, binding source/source-layer/filter onto each", () => {
    const layers = Water.apply({
      source: "openmaptiles",
      sourceLayer: "water",
      filter: new Filter().polygon(),
    }).build()

    expect(layers.map((l) => l.id)).toEqual(["water-outline", "water"])
    for (const layer of layers) {
      expect(layer).toMatchObject({
        source: "openmaptiles",
        "source-layer": "water",
        filter: ["==", ["geometry-type"], "Polygon"],
      })
    }
  })

  it("is immutable: .apply/.theme/.patch return new builders", () => {
    const base = Label.apply({ source: "a" })
    const themed = base.theme({ textField: "name" })

    expect(themed).not.toBe(base)
    expect(base.build()[0].theme).toEqual({})
  })

  const line = ["==", ["geometry-type"], "LineString"]
  const cls = ["==", ["get", "class"], "primary"]

  // Filter resolution: a layer's own filter, the context filter, and filters
  // accumulated across repeated .apply calls all AND together (own leading),
  // Filters compile while raw expressions pass through, and an absent filter is
  // omitted entirely.
  it.each([
    ["own AND context, own leading", () => Label.apply({ filter: new Filter().is("class", "primary") }).apply({ filter: new Filter().line() }), ["all", cls, line]],
    ["accumulates across .apply", () => Label.apply({ filter: new Filter().line() }).apply({ filter: new Filter().is("class", "primary") }), ["all", line, cls]],
    ["compiles a Filter", () => Label.apply({ filter: new Filter().line() }), line],
    ["passes a raw expression through", () => Label.apply({ filter: ["==", ["get", "x"], 1] }), ["==", ["get", "x"], 1]],
    ["omits an absent filter", () => Label.apply(), undefined],
  ])("filter resolution: %s", (_, build, expected) => {
    const [layer] = build().build()

    if (expected === undefined) {
      expect(layer).not.toHaveProperty("filter")
    } else {
      expect(layer.filter).toEqual(expected)
    }
  })

  it("merges themes across calls, passing the resolved theme to the style function", () => {
    const [layer] = Label.theme({ textField: "name" }).apply({ source: "x" }).theme({}).build()
    expect(layer.theme).toEqual({ textField: "name" })
  })

  it("patchAll merges a patch onto every built layer", () => {
    const Extrusion = style("Extrusion", () => [{ id: "b", type: "fill-extrusion", paint: { "fill-extrusion-opacity": 1 } }])

    const [layer] = Extrusion.patchAll({
      paint: { "fill-extrusion-height": { property: "render_height", type: "identity" } },
    }).build()

    expect(layer.paint).toEqual({
      "fill-extrusion-opacity": 1,
      "fill-extrusion-height": { property: "render_height", type: "identity" },
    })
  })

  // patch takes a (layer) => layer transform applied to each layer, or an
  // { id: partial } map merged onto the matching layers (others untouched).
  it.each([
    ["a function, over every layer", Water.patch((l) => ({ ...l, id: l.id.replace("water", "sea") })), ["sea-outline", "sea"]],
    ["a map, leaving unmatched ids untouched", Water.patch({ water: { id: "lake" } }), ["water-outline", "lake"]],
    ["repeated calls, in order", Water.patch({ water: { id: "lake" } }).patch({ lake: { id: "sea" } }), ["water-outline", "sea"]],
  ])("rewrites ids via patch with %s", (_, builder, expected) => {
    expect(builder.build().map((l) => l.id)).toEqual(expected)
  })

  it("patch's map form deep-merges paint onto the matching layer", () => {
    const [outline, fill] = Water.patch({ water: { paint: { "fill-opacity": 0.5 } } }).build()

    expect(fill.paint).toEqual({ "fill-color": "blue", "fill-opacity": 0.5 })
    expect(outline.paint).toEqual({ "line-color": "blue" })
  })
})

describe("style().onlyLayer", () => {
  it("builds only the single named layer, with accumulated config bound", () => {
    const layers = Water.apply({ source: "openmaptiles", sourceLayer: "water" })
      .onlyLayer("water-outline")
      .build()

    expect(layers).toHaveLength(1)
    expect(layers[0]).toMatchObject({
      id: "water-outline",
      source: "openmaptiles",
      "source-layer": "water",
    })
  })

  it("throws when the id is not present in the style", () => {
    expect(() => Water.onlyLayer("nope").build()).toThrow()
  })
})

