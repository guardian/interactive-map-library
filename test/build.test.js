import { describe, it, expect } from "vitest"
import { buildGlStyle, casingsFirst } from "../src/core/build.js"

describe("buildGlStyle", () => {
  it("assembles furniture and a flattened layer list into a GL document", () => {
    const built = buildGlStyle(
      {
        version: 8,
        name: "Test",
        glyphs: "https://example.com/{fontstack}/{range}.pbf",
        sprite: "https://example.com/sprite",
        metadata: { copyright: "none" },
        sources: { openmaptiles: { type: "vector" } },
      },
      [{ id: "a" }, [{ id: "b" }, { id: "c" }]],
    )

    expect(built).toEqual({
      version: 8,
      name: "Test",
      glyphs: "https://example.com/{fontstack}/{range}.pbf",
      sprite: "https://example.com/sprite",
      metadata: { copyright: "none" },
      sources: { openmaptiles: { type: "vector" } },
      layers: [{ id: "a" }, { id: "b" }, { id: "c" }],
    })
  })

  it("flattens arbitrarily nested layer groups in order", () => {
    const built = buildGlStyle({}, [{ id: "a" }, [[{ id: "b" }], { id: "c" }]])
    expect(built.layers.map((l) => l.id)).toEqual(["a", "b", "c"])
  })

  it("defaults version to 8 and omits absent furniture", () => {
    const built = buildGlStyle({}, [])
    expect(built.version).toBe(8)
    expect(built).not.toHaveProperty("name")
    expect(built).not.toHaveProperty("sources")
    expect(built.layers).toEqual([])
  })
})

describe("casingsFirst", () => {
  it("flattens each road's layers, moving every casing ahead of every fill", () => {
    const minor = [{ id: "minor-casing" }, { id: "minor" }]
    const major = [{ id: "major-casing" }, { id: "major" }]

    expect(casingsFirst(minor, major).map((l) => l.id)).toEqual([
      "minor-casing",
      "major-casing",
      "minor",
      "major",
    ])
  })

  it("does not mutate the roads passed in", () => {
    const road = [{ id: "a" }, { id: "a-casing" }]
    casingsFirst(road)
    expect(road.map((l) => l.id)).toEqual(["a", "a-casing"])
  })
})
