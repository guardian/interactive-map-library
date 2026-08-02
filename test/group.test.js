import { describe, it, expect } from "vitest"
import { style } from "../src/core/style.js"
import { group } from "../src/core/group.js"
import { Filter } from "../src/core/filter/index.js"

const Water = style("Water", () => [
  { id: "water-outline", type: "line", paint: { "line-color": "blue" } },
  { id: "water", type: "fill", paint: { "fill-color": "blue" } },
])

const Label = style("Label", (theme) => [
  { id: "label", type: "symbol", layout: { "text-field": theme.textField } },
])

const Road = style("Road", () => [{ id: "road", type: "line" }])

describe("group build", () => {
  it("concatenates children in order and stamps iml.style + iml.group", () => {
    const g = group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })])
    const layers = g.build()

    expect(layers.map((l) => l.id)).toEqual(["water-outline", "water"])
    for (const layer of layers) {
      expect(layer.metadata.iml).toEqual({ style: "Water", group: ["Water"] })
    }
  })

  it("accretes the group path from leaf to root through nesting", () => {
    const g = group("Roads", [group("Railways", [Road.apply({ source: "omt" })])])
    const [road] = g.build()

    expect(road.metadata.iml.group).toEqual(["Roads", "Railways"])
  })

  it("leaves each carry their own source-binding; the group adds none", () => {
    const g = group("Water", [
      Water.apply({ source: "omt", sourceLayer: "water", filter: new Filter().polygon() }),
    ])

    for (const layer of g.build()) {
      expect(layer).toMatchObject({ source: "omt", "source-layer": "water" })
    }
  })

  it("inherits theme down, and a subgroup shadows it for its subtree", () => {
    const g = group("Labels", [
      Label.apply({ source: "omt" }),
      group("Loud", [Label.apply({ source: "omt" }).renameIds({ label: "loud-label" })]).theme({
        textField: "SHOUT",
      }),
    ]).theme({ textField: "name" })

    const byId = Object.fromEntries(g.build().map((l) => [l.id, l]))

    expect(byId["label"].layout["text-field"]).toBe("name")
    expect(byId["loud-label"].layout["text-field"]).toBe("SHOUT")
  })

  it("runs post-processors over built child layers", () => {
    const reverse = (layers) => [...layers].reverse()
    const g = group("R", [Water.apply({ source: "omt" })], { post: [reverse] })

    expect(g.build().map((l) => l.id)).toEqual(["water", "water-outline"])
  })
})

const buildTree = () =>
  group("Root", [
    group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })]),
    group("Roads", [
      Road.apply({ source: "omt", sourceLayer: "transportation" }),
      group("Railways", [
        Road.apply({ source: "omt", sourceLayer: "transportation" }).renameIds({ road: "railway" }),
      ]),
    ]),
    group("Labels", [Label.apply({ source: "omt" })]).theme({ textField: "name" }),
  ])

describe("optional group name", () => {
  it("stamps nothing into iml.group for an anonymous group", () => {
    const g = group("Named", [
      group([Road.apply({ source: "omt" })]),
    ])

    const [road] = g.build()

    expect(road.metadata.iml.group).toEqual(["Named"])
  })

  it("still binds children and theme through an anonymous wrapper", () => {
    const g = group([Label.apply({ source: "omt" })]).theme({ textField: "name" })

    expect(g.build()[0].layout["text-field"]).toBe("name")
  })
})

describe("discovery", () => {
  it("lists named groups and styles in the subtree, anonymous groups excluded", () => {
    const g = group("Root", [group([Water.apply({ source: "omt" })]), group("Inner", [])])

    expect(g.groupNames()).toEqual(["Root", "Inner"])
    expect(g.styleNames()).toEqual(["Water"])
  })

  it("describe renders an indented tree", () => {
    const g = group("Root", [group("Inner", [Road.apply({ source: "omt" })])])

    expect(g.describe()).toBe("Root\n  Inner\n    Road")
  })
})

describe("append / prepend", () => {
  it("append adds children after, prepend before, returning new groups", () => {
    const base = group("G", [Road.apply({ source: "omt" })])
    const appended = base.append(Water.apply({ source: "omt" }))
    const prepended = base.prepend(Water.apply({ source: "omt" }))

    expect(appended.build().map((l) => l.id)).toEqual(["road", "water-outline", "water"])
    expect(prepended.build().map((l) => l.id)).toEqual(["water-outline", "water", "road"])
    expect(base.children).toHaveLength(1)
  })
})

describe("omitGroups / pickGroups", () => {
  it("omits a nested group wherever it sits", () => {
    const g = buildTree().omitGroups("Railways")

    expect(g.groupNames()).toEqual(["Root", "Water", "Roads", "Labels"])
    expect(g.build().map((l) => l.id)).toEqual(["water-outline", "water", "road", "label"])
  })

  it("picks a nested group whole, retaining its ancestor path, dropping siblings", () => {
    const g = buildTree().pickGroups("Railways")

    expect(g.groupNames()).toEqual(["Root", "Roads", "Railways"])
    expect(g.build().map((l) => l.id)).toEqual(["railway"])
  })

  it("accepts an instance, matching by its name", () => {
    const Railways = group("Railways", [Road.apply({ source: "omt" })])
    const g = group("Root", [Railways]).omitGroups(Railways)

    expect(g.build()).toHaveLength(0)
  })

  it("throws on a name absent from the current tree", () => {
    expect(() => buildTree().omitGroups("Nope")).toThrow(/no group named "Nope"/)
    expect(() => buildTree().omitGroups("Railways").omitGroups("Railways")).toThrow()
  })
})

describe("omitStyles / pickStyles", () => {
  it("omits a style's leaves wherever they sit, preserving tree shape", () => {
    const g = buildTree().omitStyles("Road")

    expect(g.groupNames()).toContain("Railways")
    expect(g.build().map((l) => l.id)).toEqual(["water-outline", "water", "label"])
  })

  it("picks only the named style's leaves", () => {
    const g = buildTree().pickStyles("Water")

    expect(g.build().map((l) => l.id)).toEqual(["water-outline", "water"])
  })

  it("omitStylesBy sees the builder handle for identity matching", () => {
    const only = Road.apply({ source: "omt" })
    const g = group("Root", [only, Road.apply({ source: "omt" }).renameIds({ road: "road-2" })])

    expect(g.omitStylesBy((s) => s === only).build().map((l) => l.id)).toEqual(["road-2"])
  })

  it("throws on a style name absent from the current tree", () => {
    expect(() => buildTree().omitStyles("Nope")).toThrow(/no style named "Nope"/)
  })

  it("rejects a nameless instance passed to omitStyles", () => {
    const nameless = style(undefined, () => [{ id: "x", type: "line" }])
    expect(() => buildTree().omitStyles(nameless.apply({ source: "omt" }))).toThrow(/nameless/)
  })
})

describe("provenance invariant", () => {
  it("every named group in the tree that keeps a leaf appears in iml.group, and vice versa", () => {
    const tree = buildTree()
    const nonEmpty = new Set(tree.build().flatMap((l) => l.metadata.iml.group))
    const named = new Set(tree.groupNames())

    for (const name of nonEmpty) {
      expect(named).toContain(name)
    }
  })
})

describe("group toGlStyle", () => {
  it("emits only referenced sources", () => {
    const doc = group("Root", [Water.apply({ source: "omt", sourceLayer: "water" })])
      .resources({ omt: { type: "vector" }, terrain: { type: "vector" } })
      .document({ name: "Test" })
      .toGlStyle()

    expect(Object.keys(doc.sources)).toEqual(["omt"])
    expect(doc).toMatchObject({ version: 8, name: "Test" })
    expect(doc.layers).toHaveLength(2)
  })
})

describe("group resources", () => {
  it("resolves the source subset its layers reference", () => {
    const g = group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })], {
      sources: { omt: { type: "vector" }, terrain: { type: "vector" } },
    })

    expect(g.getSources()).toEqual({ omt: { type: "vector" } })
  })

  it("derives glyphs only when a layer renders text", () => {
    const withText = group("Labels", [Label.apply({ source: "omt" })]).theme({ textField: "name" })
    const withoutText = group("Water", [Water.apply({ source: "omt" })])

    expect(withText.getGlyphsUrl()).toBeTruthy()
    expect(withoutText.getGlyphsUrl()).toBeUndefined()
  })

  it("resolves a sub-group's own sources when it carries the lookup standalone", () => {
    const inner = group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })], {
      sources: { omt: { type: "vector" } },
    })

    expect(inner.getSources()).toEqual({ omt: { type: "vector" } })
  })

  it("omits unresolved sources rather than throwing when no lookup is carried", () => {
    const g = group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })])

    expect(g.getSources()).toEqual({})
    expect(g.toGlStyle().sources).toEqual({})
    expect(g.toGlStyle().layers).toHaveLength(2)
  })

  it("gathers a nested group's sources so a wrapper needs no re-declaration", () => {
    const inner = group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })], {
      sources: { omt: { type: "vector" } },
    })
    const wrapper = group([inner])

    expect(wrapper.getSources()).toEqual({ omt: { type: "vector" } })
  })

  it("lets the outer definition win over a child's on a name conflict", () => {
    const inner = group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })], {
      sources: { omt: { type: "vector", tiles: ["child"] } },
    })
    const wrapper = group([inner], { sources: { omt: { type: "vector", tiles: ["parent"] } } })

    expect(wrapper.getSources()).toEqual({ omt: { type: "vector", tiles: ["parent"] } })
  })

  it("gathers sources from a deeply nested group", () => {
    const deep = group("Outer", [
      group("Inner", [group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })])], {
        sources: { omt: { type: "vector" } },
      }),
    ])

    expect(deep.getSources()).toEqual({ omt: { type: "vector" } })
  })
})
