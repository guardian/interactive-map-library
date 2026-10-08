# AGENTS.md

A toolkit for authoring MapLibre/Mapbox GL basemaps and styles. Source lives in
`src/`; `dist/` is a versioned build emitted by `npm run release`. Tests are
`vitest` (`npm test`).

## Vocabulary

- **Style** — a named stack of one or more GL layers (`RoadMotorway`, `WaterOcean`,
  `LabelPlaceCapital`). A road's casing + fill, or water's outline + fill, are one
  style, not two. `style("Name", (theme) => Layer[])`; templates live in
  `src/templates/`.
- **Partial** — a reusable style fragment (`pRoundLine`, `pFadeIn`, `pTextField`)
  merged into a layer body. Prefixed `p`. In `src/templates/utils/partials.js`.
- **Group** — a named, ordered, nestable set of children (styles or sub-groups),
  in `src/core/group.js`. It retains its tree and flattens to layers on demand.
  A **basemap** (`Graphics`, `Protomaps`) is the root group.
- **Provenance** — a per-layer `metadata.iml` stamp, `{ style, group }`, so
  consumers refine by name without parsing ids. `style` is the producing style's
  name; `group` is the path of enclosing named groups, root-first. The layer `id`
  is the third axis.

## The layering model

```
Partial   →   Style          →   Group     →   Basemap
pRoundLine    RoadMotorway       Roads         (the root group)
              Water              Water
              Rail               Labels
```

Everything is a lazy, immutable builder. A style accumulates config through
`.apply()`/`.theme()`/`.patch()`/`.patchAll()`; a group is an immutable tree.
Nothing resolves to layers until one root `.layers()`/`.render.*` walk. `theme`
and `resources` flow down the tree; `iml` provenance flows up.

## Styles

`style("Name", (theme) => Layer[])`. One layer is the degenerate case (an array of
one). The style is the entrypoint:

- **`Style.apply(context)` → builder** — accumulates `source` / `source-layer` /
  `filter` binding onto **all** the style's layers, so a casing/outline can't be
  dropped and a shared filter can't drift. `context.filter` is AND-ed with each
  layer's own filter. Chainable; `.build()` resolves to bound, stamped layers.
- **`.theme(theme)`** — accumulates rendering preferences passed to the style fn.
- **`.patchAll(body)`** — a verbatim merge applied to every built layer.
- **`.patch(fn | { id: partial })`** — a `(layer) => layer` transform over each
  layer, or a per-id partial deep-merged onto the matching layers (others
  untouched). Rewrites ids so a style can be re-applied without collisions (e.g.
  `Rail` → `rail_transit_line`).
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
library provenance). `config` is `{ theme, resources, document, post }`.

- **`.layers()`** walks the tree once: pushes `theme` and `resources` down to
  children that haven't set their own, builds leaves, runs `post` processors over
  built child layers, stamps `iml.group`, and concatenates in order (child order =
  z-order). An escape hatch below the `.render.*` path.
- **`.render.glStyle()`** resolves to a full GL document. Sources are derived —
  only definitions a built layer references by `source` are emitted; glyphs/sprite
  are included only when a layer needs them (`text-field`/`icon-image`).
- **`.render.maplibre(map)`** mounts onto a live map: adds the group's sources,
  glyphs, sprite, and layers.
- **`resources`** (a `resources({ name: def })` bundle) carries the sources plus
  glyphs/sprite URLs, set on the group and inherited by descendants that set none.
  `resources.prepare.maplibre(map)` wires the externals onto a live map on their
  own. Source *binding* lives on the **leaf** (`.apply`); shared bindings are
  factored with plain object spread.

### Refining a group

Refinement returns a new group (immutable, chainable):

- **`.remove(...matchers)`** — drops matched groups and styles across the subtree.
  A matched group takes its whole subtree; a matched style's leaves are pruned
  while tree shape is kept (an emptied group node stays, contributing no layers). A
  matcher is a name — matching a group *or* a style anywhere in the tree — or a
  predicate over a tagged node (`{ kind: "group" | "style", name, group | style }`),
  where identity and name-pattern matching live (`n => n.kind === "style" && n.style
  === mine`). A name matching neither a group nor a style throws (typo guard). The
  name axis is coarse: `remove("Rail")` drops every `Rail` variant, including
  re-applications under fresh ids.
- **`.pick(...matchers)`** — the opposite of `remove`: keeps only the matched
  groups and styles, plus the groups around them.
- **`.append(...children)` / `.prepend(...children)`** — add the consumer's own
  children. `group([...])` composition is the other additive primitive.

### Discovery

- **`.describe()`** — a returned (not logged) indented tree of group + style names.

## Examples

Define a style template (`src/templates/`) — plural (casing + fill), ids kept
verbatim, name matching the export binding:

```js
export const WaterOcean = style("WaterOcean", () => [
  merge({ id: "water_ocean_outline", type: "line", paint: { "line-color": color.blueWaterOutline } }),
  merge(pWaterFill, { id: "water_ocean" }),
])
```

Author a basemap (`src/basemaps/<name>/`): `sources.js` builds the `resources`;
`styles.js` binds each template into a `styles` map, a style re-applied under fresh
ids via `.patch`; `groups.js` references those styles by name; `index.js` is the
barrel:

```js
// styles.js
export const styles = {
  Rail: t.Rail.apply({ ...transportation, filter: f.cls("rail").notTunnel() }),
  RailTransit: t.Rail
    .apply({ ...transportation, filter: f.cls("transit").notTunnel() })
    .patch((layer) => ({ ...layer, id: layer.id.replace("rail_line", "rail_transit_line") })),
}

// groups.js — a `post` processor reorders where needed
const Railways = group("Railways", [s.Rail, s.RailTransit], { resources })
const Roads = group("Roads", [Tunnels, SurfaceRoads, Railways], { resources })
const Graphics = group("Graphics", [s.Background, Landcover, Water, Roads, Labels], {
  resources,
  document: { name: "Graphics" },
})
```

Consume — mount onto a live map, hand a document to a constructor, refine, or
compose your own root:

```js
import { groups } from "interactive-map-library/basemaps/graphics"

groups.Graphics.render.maplibre(map)                                 // onto a live map
new maplibregl.Map({ style: groups.Graphics.render.glStyle() })      // via the constructor
groups.Graphics.remove("Railways").render.maplibre(map)             // minus a group or style

const Mine = group([groups.Water, groups.Roads.remove("Railways")], { resources: mine })
Mine.render.maplibre(map)                                            // compose your own
```
