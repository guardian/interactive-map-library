import { describe, it, expect } from "vitest"
import { compose } from "../src/core/style.js"

describe("compose", () => {
  it("deep-merges `paint` and `layout`, keeping keys from every part", () => {
    const merged = compose(
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
    const merged = compose(
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
    compose(base, { paint: { "line-width": 2 } })
    expect(base).toEqual({ paint: { "line-color": "red" } })
  })
})
