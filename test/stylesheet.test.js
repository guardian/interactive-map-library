import { describe, it, expect } from "vitest"
import { Stylesheet } from "../src/core/stylesheet.js"
import { Filter } from "../src/core/filter/index.js"

const Style = (theme) => ({ id: "style", type: "line", paint: { "line-color": "red" }, theme })

describe("Stylesheet", () => {
  it("accumulates layers in the order they are declared", () => {
    const { layer, build } = new Stylesheet()
    layer(Style, { id: "first" })
    layer(Style, { id: "second" })
    layer(Style, { id: "third" })

    expect(build().layers.map((l) => l.id)).toEqual(["first", "second", "third"])
  })

  it("applies `defaults` to layers declared after it", () => {
    const { defaults, layer, build } = new Stylesheet()
    layer(Style, { id: "before" })
    defaults({ source: "openmaptiles", theme: { textField: "name" } })
    layer(Style, { id: "after" })

    const [before, after] = build().layers
    expect(before).not.toHaveProperty("source")
    expect(after).toMatchObject({ source: "openmaptiles", theme: { textField: "name" } })
  })

  it("cascades defaults and group config, and collects `within` layers into the sheet", () => {
    const { defaults, group, build } = new Stylesheet()
    defaults({ source: "openmaptiles" })

    group({ sourceLayer: "transportation", filter: new Filter().line() }).within((layer) => {
      layer(Style, { id: "minor", filter: new Filter().is("class", "minor") })
      layer(Style, { id: "primary", filter: new Filter().is("class", "primary") })
    })

    const layers = build().layers
    expect(layers.map((l) => l.id)).toEqual(["minor", "primary"])
    expect(layers[0]).toMatchObject({
      source: "openmaptiles",
      "source-layer": "transportation",
    })
    expect(layers[0].filter).toEqual([
      "all",
      ["==", ["geometry-type"], "LineString"],
      ["==", ["get", "class"], "minor"],
    ])
  })

  it("supports nested groups via the sink returned from `group`", () => {
    const { group, build } = new Stylesheet()
    const outer = group({ source: "openmaptiles" })
    outer.group({ sourceLayer: "water" }).layer(Style, { id: "w" })

    expect(build().layers[0]).toMatchObject({
      id: "w",
      source: "openmaptiles",
      "source-layer": "water",
    })
  })

  it("builds a complete GL document from the furniture plus accumulated layers", () => {
    const sheet = new Stylesheet({
      version: 8,
      name: "Test",
      glyphs: "https://example.com/{fontstack}/{range}.pbf",
      sprite: "https://example.com/sprite",
      metadata: { copyright: "none" },
      sources: { openmaptiles: { type: "vector" } },
    })

    sheet.layer(Style, { id: "only", source: "openmaptiles" })

    expect(sheet.build()).toEqual({
      version: 8,
      name: "Test",
      glyphs: "https://example.com/{fontstack}/{range}.pbf",
      sprite: "https://example.com/sprite",
      metadata: { copyright: "none" },
      sources: { openmaptiles: { type: "vector" } },
      layers: [
        {
          id: "only",
          type: "line",
          paint: { "line-color": "red" },
          theme: {},
          source: "openmaptiles",
        },
      ],
    })
  })

  it("defaults version to 8 and omits absent furniture", () => {
    const built = new Stylesheet().build()
    expect(built.version).toBe(8)
    expect(built).not.toHaveProperty("name")
    expect(built).not.toHaveProperty("sources")
    expect(built.layers).toEqual([])
  })
})
