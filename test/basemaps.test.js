import { describe, it, expect } from "vitest"
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec"
import { groups as graphics } from "../src/basemaps/graphics/index.js"
import { groups as protomaps } from "../src/basemaps/protomaps/index.js"

// Snapshot tests for the generated basemaps, so any code changes that unintentionally change
// the basemap output leads to failing tests.
//
// After code changes that make valid changes to the snapshots, update them with
// `npm run test -- -u`.
describe.each([
  ["Graphics", graphics.Graphics.toGlStyle()],
  ["Protomaps", protomaps.Protomaps.toGlStyle()],
])("%s basemap", (name, style) => {
  it("matches its snapshot", () => {
    expect(style).toMatchSnapshot()
  })

  it("is a valid GL style", () => {
    expect(validateStyleMin(style)).toEqual([])
  })

  it("has unique layer ids", () => {
    const ids = style.layers.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("every non-background layer references a declared source", () => {
    const sources = new Set(Object.keys(style.sources))
    for (const l of style.layers) {
      if (l.type === "background") {
        continue
      }
      expect(sources).toContain(l.source)
    }
  })

  it("stamps every layer with iml.style and an iml.group path rooted at the basemap", () => {
    for (const l of style.layers) {
      expect(l.metadata.iml.style).toBeTruthy()
      expect(l.metadata.iml.group[0]).toBe(name)
    }
  })
})
