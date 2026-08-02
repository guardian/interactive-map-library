# AGENTS.md

A toolkit for authoring MapLibre/Mapbox GL basemaps and styles. Source lives in
`src/`; `dist/` is a versioned build emitted by `npm run release`. Tests are
`vitest` (`npm test`).

## Vocabulary

- **Style** — a named stack of one or more GL layers (`Motorway`, `Ocean`,
  `PlaceCapital`). A road's casing + fill, or water's outline + fill, are one
  style, not two. `style("Name", (theme) => Layer[])`; lives in `src/styles/`.
- **Partial** — a reusable style fragment (`pRoundLine`, `pFadeIn`, `pTextField`)
  merged into a layer body. Prefixed `p`. In `src/styles/utils/partials.js`.
- **Group** — a named, ordered, nestable set of children (styles or sub-groups),
  in `src/core/group.js`. It retains its tree and flattens to layers on demand.
  A **basemap** (`Graphics`, `Protomaps`) is the root group.
- **Provenance** — a per-layer `metadata.iml` stamp, `{ style, group }`, so
  consumers refine by name without parsing ids. `style` is the producing style's
  name; `group` is the path of enclosing named groups, root-first. The layer `id`
  is the third axis.

## The layering model

```
Partial   →   Style        →   Group     →   Basemap
pRoundLine    Motorway         Roads         (the root group)
              Water            Water
              Railway          Labels
```

Everything is a lazy, immutable builder. A style accumulates config through
`.apply()`/`.theme()`/`.patch()`/`.renameIds()`; a group is an immutable tree.
Nothing resolves to layers until one root `.build()`/`.toGlStyle()` walk. `theme`
flows down the tree; `iml` provenance flows up.

## Styles

`style("Name", (theme) => Layer[])`. One layer is the degenerate case (an array of
one). The style is the entrypoint:

- **`Style.apply(context)` → builder** — accumulates `source` / `source-layer` /
  `filter` binding onto **all** the style's layers, so a casing/outline can't be
  dropped and a shared filter can't drift. `context.filter` is AND-ed with each
  layer's own filter. Chainable; `.build()` resolves to bound, stamped layers.
- **`.theme(theme)`** — accumulates rendering preferences passed to the style fn.
- **`.patch(patch)`** — a verbatim merge applied to every built layer.
- **`.renameIds(fn | { oldId: newId })`** — rewrites built ids, so a style can be
  re-applied without id collisions (e.g. `Railway` → `railway-transit`).
- **`Style.onlyLayer(id).apply(...)`** — narrows to one layer. Throws if absent.
- **`merge(...parts)`** — shallow-merges `layout`/`paint`, last-wins otherwise.
  Used inside style bodies.

Filters are **not** inherited through a group. What was a group filter is a
standalone `const` AND-ed into each `.apply`. Ids live in layer bodies and are a
third-party contract — keep them verbatim.

## Groups

`group(name?, children, config?)` — the name is optional (a named group is a
provenance level stamped into `iml.group`; an anonymous one is a structural
container that stamps nothing, so a consumer's throwaway wrapper doesn't pollute
library provenance). `config` is `{ theme, sources, document, post }`.

- **`.build()`** walks the tree once: pushes `theme` down to children that haven't
  set their own, builds leaves, runs `post` processors over built child layers,
  stamps `iml.group`, and concatenates in order (child order = z-order).
- **`.toGlStyle()`** resolves to a full GL document. Sources are derived — only
  definitions a built layer references by `source` are emitted; glyphs/sprite are
  included only when a layer needs them (`text-field`/`icon-image`).
- Source binding lives on the **leaf** (`.apply`); a group inherits none. Shared
  bindings are factored with plain object spread. The `sources` *lookup* (name →
  definition) merges across the subtree, so a group composed from self-contained
  sub-groups resolves their sources without re-declaring them; the outer definition
  wins on a name conflict.

### Refining a group

Refinement returns a new group (immutable, chainable). Two axes — group nodes and
style leaves — each with subtractive/additive and name/predicate forms:

- **`.omitGroups(...names)` / `.pickGroups(...names)`** — a **node-drop**. Matches
  a group name anywhere in the subtree. `pick` keeps matched subtrees whole,
  retaining the ancestor path and pruning siblings along it. A name is a string or
  an instance's `.name`; an unmatched name throws (typo guard).
- **`.omitStyles(...names)` / `.pickStyles(...names)`** — a **leaf-prune**. Drops
  layers of the named styles wherever they sit; tree shape is preserved (an
  emptied group node stays, contributing no layers). Same string-or-instance
  matching; unmatched throws. The axis is deliberately coarse: `omitStyles("Railway")`
  drops every `Railway` variant, including renamed re-applications.
- **`.omitGroupsBy(fn)` / `.pickGroupsBy(fn)`** — predicate over the `Group` node.
- **`.omitStylesBy(fn)` / `.pickStylesBy(fn)`** — predicate over the style
  builder handle. Identity and name-pattern matching live here
  (`omitStylesBy(s => s === mine)`, `omitStylesBy(s => s.name.startsWith("Place"))`).
- **`.append(...children)` / `.prepend(...children)`** — add the consumer's own
  children. `group([...])` composition is the other additive primitive.

### Discovery

- **`.describe()`** — a returned (not logged) indented tree of group + style names.
- **`.groupNames()` / `.styleNames()`** — flat arrays of every named group / style
  in the subtree, for testing, linting, and programmatic refinement. They report
  the tree (what is refinable), not the built output.

## Examples

Define a style (`src/styles/`) — plural (casing + fill), ids kept verbatim, name
matching the export binding:

```js
export const Ocean = style("Ocean", () => [
  merge({ id: "ocean-outline", type: "line", paint: { "line-color": color.blueWaterOutline } }),
  merge(pWaterFill, { id: "ocean" }),
])
```

Author a basemap (`src/basemaps/`) — regions are named groups, a style re-applied
under new ids via `.renameIds`, a `post` processor reorders where needed:

```js
const Railways = group("Railways", [
  s.Railway.apply({ ...transportation, filter: f.cls("rail").notTunnel() }),
  s.Railway
    .apply({ ...transportation, filter: f.cls("transit").notTunnel() })
    .renameIds((id) => id.replace("railway", "railway-transit")),
], { sources })

export const Roads = group("Roads", [Tunnels, SurfaceRoads, Railways], { sources })

export const Graphics = group("Graphics", [
  s.Background.apply(), Landcover, Water, Roads, Labels,
], { sources, document: { name: "Graphics" } })
```

Consume — render as-is, refine, or compose your own root from library groups:

```js
import { Graphics, Water, Roads } from "interactive-map-library/basemaps/graphics.js"

map.setStyle(Graphics.toGlStyle())                                   // as-is
map.setStyle(Graphics.omitGroups("Railways").toGlStyle())            // minus a group
map.setStyle(Graphics.pickGroups("Water", "Roads", "Labels").toGlStyle())  // a few groups

const Mine = group([Water, Roads.omitGroups("Railways"), myLabels], { sources: mySources })
map.setStyle(Mine.toGlStyle())                                       // compose your own
```
