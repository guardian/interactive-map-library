import { describe, it, expect } from "vitest"
import { style } from "../src/core/style.js"
import { group } from "../src/core/group.js"
import { resources } from "../src/core/resources.js"
import { Filter } from "../src/filter/index.js"

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
      group("Loud", [Label.apply({ source: "omt" }).patch({ label: { id: "loud-label" } })]).theme({
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
        Road.apply({ source: "omt", sourceLayer: "transportation" }).patch({ road: { id: "railway" } }),
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

const ids = (g) => g.build().map((l) => l.id)

describe("omitGroups / pickGroups", () => {
  // omit drops a matched group's subtree wherever it sits; pick keeps it whole
  // with its ancestor path, dropping siblings.
  it.each([
    ["omitGroups", (t) => t.omitGroups("Railways"), ["Root", "Water", "Roads", "Labels"], ["water-outline", "water", "road", "label"]],
    ["pickGroups", (t) => t.pickGroups("Railways"), ["Root", "Roads", "Railways"], ["railway"]],
  ])("%s matches a nested group by name", (_, refine, names, layerIds) => {
    const g = refine(buildTree())

    expect(g.groupNames()).toEqual(names)
    expect(ids(g)).toEqual(layerIds)
  })

  it("accepts an instance, matching by its name", () => {
    const Railways = group("Railways", [Road.apply({ source: "omt" })])
    const g = group("Root", [Railways]).omitGroups(Railways)

    expect(g.build()).toHaveLength(0)
  })

  it("throws on a name absent from the current tree, including a double-remove", () => {
    expect(() => buildTree().omitGroups("Nope")).toThrow(/no group named "Nope"/)
    expect(() => buildTree().omitGroups("Railways").omitGroups("Railways")).toThrow()
  })
})

describe("omitStyles / pickStyles", () => {
  // Leaf-level: omit drops a style's leaves wherever they sit (tree shape kept),
  // pick keeps only the named style's leaves.
  it.each([
    ["omitStyles", (t) => t.omitStyles("Road"), ["water-outline", "water", "label"]],
    ["pickStyles", (t) => t.pickStyles("Water"), ["water-outline", "water"]],
  ])("%s matches a style by name, preserving tree shape", (_, refine, layerIds) => {
    const g = refine(buildTree())

    expect(g.groupNames()).toContain("Railways")
    expect(ids(g)).toEqual(layerIds)
  })

  it("omitStylesBy sees the builder handle for identity matching", () => {
    const only = Road.apply({ source: "omt" })
    const g = group("Root", [only, Road.apply({ source: "omt" }).patch({ road: { id: "road-2" } })])

    expect(ids(g.omitStylesBy((s) => s === only))).toEqual(["road-2"])
  })

  it("throws on an absent style name, and rejects a nameless instance", () => {
    expect(() => buildTree().omitStyles("Nope")).toThrow(/no style named "Nope"/)

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

const twoSources = resources({ omt: { type: "vector" }, terrain: { type: "vector" } })

describe("group toGlStyle", () => {
  it("emits only referenced sources", () => {
    const doc = group("Root", [Water.apply({ source: "omt", sourceLayer: "water" })], { resources: twoSources })
      .document({ name: "Test" })
      .toGlStyle()

    expect(Object.keys(doc.sources)).toEqual(["omt"])
    expect(doc).toMatchObject({ version: 8, name: "Test" })
    expect(doc.layers).toHaveLength(2)
  })
})

describe("group resources", () => {
  const water = () => Water.apply({ source: "omt", sourceLayer: "water" })

  // Sources come from the group's resources, tree-shaken to those the built layers
  // reference; resources flow to a sub-group that hasn't set their own. A group with
  // no resources resolves nothing.
  it.each([
    ["the subset its layers reference", group("Water", [water()], { resources: twoSources }), { omt: { type: "vector" } }],
    ["resources inherited by a sub-group", group("Outer", [group("Inner", [water()])], { resources: twoSources }), { omt: { type: "vector" } }],
    ["nothing when no resources are carried", group("Water", [water()]), {}],
  ])("getSources resolves %s", (_, g, expected) => {
    expect(g.getSources()).toEqual(expected)
  })

  it("emits its resolved sources through toGlStyle, omitting unreferenced ones", () => {
    const g = group("Water", [water()], { resources: twoSources })

    expect(g.toGlStyle().sources).toEqual({ omt: { type: "vector" } })
    expect(g.toGlStyle().layers).toHaveLength(2)
  })

  it("derives glyphs only when a layer renders text", () => {
    const withText = group("Labels", [Label.apply({ source: "omt" })], { resources: twoSources }).theme({ textField: "name" })
    const withoutText = group("Water", [Water.apply({ source: "omt" })], { resources: twoSources })

    expect(withText.getGlyphsUrl()).toBeTruthy()
    expect(withoutText.getGlyphsUrl()).toBeUndefined()
  })
})
