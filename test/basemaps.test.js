import { describe, it, expect } from "vitest"
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec"
import { graphics } from "../src/basemaps/graphics.js"
import { protomaps } from "../src/basemaps/protomaps.js"

// Snapshot tests for the generated basemaps, so any code changes that unintentionally change
// the basemap output leads to failing tests.
//
// After code changes that make valid changes to the snapshots, update them with
// `npm run test -- -u`.
describe.each([
  ["graphics", graphics],
  ["protomaps", protomaps],
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
})
