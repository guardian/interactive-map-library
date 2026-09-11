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

describe("group layers", () => {
  it("concatenates children in order and stamps iml.style + iml.group", () => {
    const g = group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })])
    const layers = g.layers()

    expect(layers.map((l) => l.id)).toEqual(["water-outline", "water"])
    for (const layer of layers) {
      expect(layer.metadata.iml).toEqual({ style: "Water", group: ["Water"] })
    }
  })

  it("accretes the group path from leaf to root through nesting", () => {
    const g = group("Roads", [group("Railways", [Road.apply({ source: "omt" })])])
    const [road] = g.layers()

    expect(road.metadata.iml.group).toEqual(["Roads", "Railways"])
  })

  it("leaves each carry their own source-binding; the group adds none", () => {
    const g = group("Water", [
      Water.apply({ source: "omt", sourceLayer: "water", filter: new Filter().polygon() }),
    ])

    for (const layer of g.layers()) {
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

    const byId = Object.fromEntries(g.layers().map((l) => [l.id, l]))

    expect(byId["label"].layout["text-field"]).toBe("name")
    expect(byId["loud-label"].layout["text-field"]).toBe("SHOUT")
  })

  it("runs post-processors over built child layers", () => {
    const reverse = (layers) => [...layers].reverse()
    const g = group("R", [Water.apply({ source: "omt" })], { post: [reverse] })

    expect(g.layers().map((l) => l.id)).toEqual(["water", "water-outline"])
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

    const [road] = g.layers()

    expect(road.metadata.iml.group).toEqual(["Named"])
  })

  it("still binds children and theme through an anonymous wrapper", () => {
    const g = group([Label.apply({ source: "omt" })]).theme({ textField: "name" })

    expect(g.layers()[0].layout["text-field"]).toBe("name")
  })
})

describe("describe", () => {
  it("renders an indented tree, anonymous groups labelled", () => {
    const g = group("Root", [group("Inner", [Road.apply({ source: "omt" })]), group([])])

    expect(g.describe()).toBe("Root\n  Inner\n    Road\n  (anonymous)")
  })
})

describe("append / prepend", () => {
  it("append adds children after, prepend before, returning new groups", () => {
    const base = group("G", [Road.apply({ source: "omt" })])
    const appended = base.append(Water.apply({ source: "omt" }))
    const prepended = base.prepend(Water.apply({ source: "omt" }))

    expect(appended.layers().map((l) => l.id)).toEqual(["road", "water-outline", "water"])
    expect(prepended.layers().map((l) => l.id)).toEqual(["water-outline", "water", "road"])
    expect(base.children).toHaveLength(1)
  })
})

const ids = (g) => g.layers().map((l) => l.id)

describe("remove", () => {
  it("drops a matched group's whole subtree, wherever it nests", () => {
    const g = buildTree().remove("Railways")

    expect(ids(g)).toEqual(["water-outline", "water", "road", "label"])
  })

  it("drops a matched style's leaves everywhere, preserving tree shape", () => {
    const g = buildTree().remove("Road")

    // The emptied Railways group node survives, contributing no layers.
    expect(ids(g)).toEqual(["water-outline", "water", "label"])
    expect(g.describe()).toContain("Railways")
  })

  it("matches groups and styles in a single call", () => {
    const g = buildTree().remove("Water", "Label")

    expect(ids(g)).toEqual(["road", "railway"])
  })

  it("accepts a group instance, matching by its name", () => {
    const Railways = group("Railways", [Road.apply({ source: "omt" })])
    const g = group("Root", [Railways]).remove(Railways.name)

    expect(g.layers()).toHaveLength(0)
  })

  it("a predicate sees the tagged node for identity and pattern matching", () => {
    const only = Road.apply({ source: "omt" })
    const g = group("Root", [only, Road.apply({ source: "omt" }).patch({ road: { id: "road-2" } })])

    expect(ids(g.remove((node) => node.kind === "style" && node.style === only))).toEqual(["road-2"])
  })

  it("throws on a name matching neither a group nor a style", () => {
    expect(() => buildTree().remove("Nope")).toThrow(/no group or style named "Nope"/)
    expect(() => buildTree().remove("Railways").remove("Railways")).toThrow()
  })
})

describe("provenance invariant", () => {
  it("every group name in iml.group is a named group still in the tree", () => {
    const tree = buildTree()
    const stamped = new Set(tree.layers().flatMap((l) => l.metadata.iml.group))

    for (const name of stamped) {
      expect(tree.describe()).toContain(name)
    }
  })
})

const twoSources = resources({ omt: { type: "vector" }, terrain: { type: "vector" } })

describe("render.glStyle", () => {
  it("emits only referenced sources, in a versioned document", () => {
    const doc = group("Root", [Water.apply({ source: "omt", sourceLayer: "water" })], {
      resources: twoSources,
      document: { name: "Test" },
    }).render.glStyle()

    expect(Object.keys(doc.sources)).toEqual(["omt"])
    expect(doc).toMatchObject({ version: 8, name: "Test" })
    expect(doc.layers).toHaveLength(2)
  })

  it("resolves nothing when no resources are carried", () => {
    const doc = group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })]).render.glStyle()

    expect(doc.sources).toEqual({})
  })

  it("emits glyphs only when a layer renders text", () => {
    const withText = group("Labels", [Label.apply({ source: "omt" })], { resources: twoSources }).theme({
      textField: "name",
    })
    const withoutText = group("Water", [Water.apply({ source: "omt" })], { resources: twoSources })

    expect(withText.render.glStyle().glyphs).toBeTruthy()
    expect(withoutText.render.glStyle().glyphs).toBeUndefined()
  })
})

describe("render.maplibre", () => {
  const fakeMap = () => {
    const map = {
      sources: {},
      layers: [],
      glyphs: undefined,
      sprite: undefined,
      addSource: (name, def) => (map.sources[name] = def),
      getSource: (name) => map.sources[name],
      addLayer: (layer) => map.layers.push(layer),
      setGlyphs: (url) => (map.glyphs = url),
      setSprite: (url) => (map.sprite = url),
    }

    return map
  }

  it("adds referenced sources and this group's layers onto a live map", () => {
    const map = fakeMap()

    group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })], {
      resources: twoSources,
    }).render.maplibre(map)

    expect(Object.keys(map.sources)).toEqual(["omt", "terrain"])
    expect(map.layers.map((l) => l.id)).toEqual(["water-outline", "water"])
    expect(map.glyphs).toBeTruthy()
  })

  it("leaves an already-present source untouched", () => {
    const map = fakeMap()
    map.addSource("omt", { type: "vector", tiles: ["mine"] })

    group("Water", [Water.apply({ source: "omt", sourceLayer: "water" })], {
      resources: twoSources,
    }).render.maplibre(map)

    expect(map.sources.omt).toEqual({ type: "vector", tiles: ["mine"] })
  })
})
