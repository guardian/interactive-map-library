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

  it("ANDs the context filter with a layer's own filter", () => {
    const Road = style("Road", () => [
      { id: "road", type: "line", filter: new Filter().is("class", "primary") },
    ])

    const [road] = Road.apply({ filter: new Filter().line() }).build()

    // The layer's own filter leads, with the context filter AND-ed onto it.
    expect(road.filter).toEqual([
      "all",
      ["==", ["get", "class"], "primary"],
      ["==", ["geometry-type"], "LineString"],
    ])
  })

  it("ANDs filters accumulated across repeated .apply calls", () => {
    const [road] = Label.apply({ filter: new Filter().line() })
      .apply({ filter: new Filter().is("class", "primary") })
      .build()

    expect(road.filter).toEqual([
      "all",
      ["==", ["geometry-type"], "LineString"],
      ["==", ["get", "class"], "primary"],
    ])
  })

  it("compiles a Filter and passes a raw expression through untouched", () => {
    expect(Label.apply({ filter: new Filter().point() }).build()[0].filter).toEqual([
      "==",
      ["geometry-type"],
      "Point",
    ])
    expect(Label.apply({ filter: ["==", ["get", "x"], 1] }).build()[0].filter).toEqual([
      "==",
      ["get", "x"],
      1,
    ])
  })

  it("omits filter when neither the layer nor the context sets one", () => {
    expect(Label.apply().build()[0]).not.toHaveProperty("filter")
  })

  it("passes the theme to the style function", () => {
    expect(Label.theme({ textField: "name" }).build()[0].theme).toEqual({ textField: "name" })
  })

  it("merges themes across calls: a later theme doesn't wipe an earlier field", () => {
    const [layer] = Label.theme({ textField: "name" }).apply({ source: "x" }).theme({}).build()
    expect(layer.theme).toEqual({ textField: "name" })
  })

  it("merges a patch verbatim onto every built layer", () => {
    const Extrusion = style("Extrusion", () => [{ id: "b", type: "fill-extrusion", paint: { "fill-extrusion-opacity": 1 } }])

    const [layer] = Extrusion.patch({
      paint: { "fill-extrusion-height": { property: "render_height", type: "identity" } },
    }).build()

    expect(layer.paint).toEqual({
      "fill-extrusion-opacity": 1,
      "fill-extrusion-height": { property: "render_height", type: "identity" },
    })
  })

  it("renames built ids with a function, over every layer", () => {
    const ids = Water.renameIds((id) => id.replace("water", "sea"))
      .build()
      .map((l) => l.id)

    expect(ids).toEqual(["sea-outline", "sea"])
  })

  it("renames built ids with a lookup, leaving unlisted ids untouched", () => {
    const ids = Water.renameIds({ water: "lake" })
      .build()
      .map((l) => l.id)

    expect(ids).toEqual(["water-outline", "lake"])
  })

  it("applies renames after patches, in accumulation order", () => {
    const ids = Label.renameIds({ label: "first" })
      .renameIds({ first: "second" })
      .build()
      .map((l) => l.id)

    expect(ids).toEqual(["second"])
  })
})

describe("style().onlyLayer", () => {
  it("builds only the single named layer, bound", () => {
    const [outline] = Water.onlyLayer("water-outline")
      .apply({ source: "openmaptiles", sourceLayer: "water" })
      .build()

    expect(outline).toMatchObject({
      id: "water-outline",
      source: "openmaptiles",
      "source-layer": "water",
    })
  })

  it("preserves accumulated config when selecting a layer", () => {
    const [outline] = Water.apply({ source: "openmaptiles" }).onlyLayer("water-outline").build()
    expect(outline).toMatchObject({ id: "water-outline", source: "openmaptiles" })
  })

  it("throws when the id is not present in the style", () => {
    expect(() => Water.onlyLayer("nope").build()).toThrow()
  })
})

