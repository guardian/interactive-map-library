import { Builder } from "./style.js"
import { GLYPHS_URL, SPRITE_URL, needsGlyphs, needsSprite } from "./resources.js"

/**
 * @import { ResolvedLayer, StyleConfig, Theme } from "./style.js"
 */

/**
 * A child of a group: another {@link Group}, or a style {@link Builder} (an
 * `.apply(...)` result). Both resolve to stamped layers via `.build`.
 *
 * @typedef {Group | Builder} GroupChild
 */

/**
 * A function run over a group's built child layers before they are concatenated,
 * for structural reordering such as drawing casings before fills.
 *
 * @typedef {(layers: ResolvedLayer[]) => ResolvedLayer[]} PostProcessor
 */

/**
 * Document-envelope fields, meaningful only at a root group.
 *
 * @typedef {object} DocumentFields
 * @property {number} [version]
 * @property {string} [name]
 * @property {object} [metadata]
 */

/**
 * A group's config. `theme` flows down to descendants that don't set their own;
 * `document` and `post` belong to the node they're set on. `sources` is the lookup
 * `.toGlStyle`/`.getSources` resolve layers against; it merges with every
 * descendant group's `sources` so a group composed from self-contained sub-groups
 * needs no re-declaration, the outer (shallower) definition winning on a conflict.
 * Glyphs and sprite are style concerns derived from the layer body, not configured
 * here — see {@link Builder#getGlyphsUrl}.
 *
 * @typedef {object} GroupConfig
 * @property {Theme} [theme]
 * @property {Record<string, object>} [sources] Source lookup keyed by source name;
 *   only names a layer references are resolved.
 * @property {DocumentFields} [document]
 * @property {PostProcessor[]} [post]
 */

/**
 * Prepends this group's name to each layer's `iml.group` path, building the path
 * leaves-to-root as the walk unwinds.
 *
 * @param {ResolvedLayer[]} layers
 * @param {string} name
 * @returns {ResolvedLayer[]}
 */
const stampGroup = (layers, name) => {
  if (name === undefined) {
    return layers
  }

  return layers.map((layer) => {
    const iml = layer.metadata?.iml ?? {}
    const group = [name, ...(iml.group ?? [])]

    return { ...layer, metadata: { ...layer.metadata, iml: { ...iml, group } } }
  })
}

/**
 * The inheritable part of a group's config (theme), as a {@link StyleConfig} a
 * child builder can inherit.
 *
 * @param {GroupConfig} config
 * @returns {StyleConfig}
 */
const inheritable = (config) => ({ theme: config.theme })

/**
 * Reduces an omit/pick argument to the name it matches on. A nameless instance
 * has no name to match — identity matching belongs to the `...By` variants — so
 * it throws rather than silently matching nothing.
 *
 * @param {string | { name?: string }} arg
 * @param {string} axis "group" or "style", for the error message
 * @returns {string}
 */
const nameOf = (arg, axis) => {
  if (typeof arg === "string") {
    return arg
  }

  if (arg.name === undefined) {
    throw new Error(`cannot omit/pick a ${axis} by a nameless instance; use the by-predicate variant`)
  }

  return arg.name
}

/**
 * The subset of a source lookup that `layers` reference by `source` name.
 *
 * @param {Record<string, object>} lookup
 * @param {ResolvedLayer[]} layers
 * @returns {Record<string, object>}
 */
const resolveSources = (lookup, layers) => {
  const referenced = new Set(layers.map((layer) => layer.source).filter(Boolean))

  return Object.fromEntries(Object.entries(lookup).filter(([name]) => referenced.has(name)))
}

/**
 * The merged source lookup across a group and all its descendants, so a group
 * composed from self-contained sub-groups resolves their sources without
 * re-declaring them. On a name conflict the outer (shallower) definition wins,
 * letting a consumer override a child's source by declaring their own.
 *
 * @param {Group} root
 * @returns {Record<string, object>}
 */
const gatherSources = (root) => {
  const merged = {}

  // groupNodes is outer-first; merge deepest-first so shallower overwrites.
  for (const node of groupNodes(root).reverse()) {
    Object.assign(merged, node.config.sources)
  }

  return merged
}

/**
 * Every {@link Group} node in a tree, this one and all its descendants, depth
 * first.
 *
 * @param {Group} root
 * @returns {Group[]}
 */
const groupNodes = (root) => {
  const nested = root.children.filter((child) => child instanceof Group)

  return [root, ...nested.flatMap((child) => groupNodes(/** @type {Group} */ (child)))]
}

/**
 * Every style {@link Builder} leaf in a tree, in tree order.
 *
 * @param {Group} root
 * @returns {Builder[]}
 */
const styleLeaves = (root) =>
  root.children.flatMap((child) => {
    if (child instanceof Group) {
      return styleLeaves(child)
    }

    return [child]
  })

/**
 * A named, ordered, nestable set of children (styles or sub-groups) that retains
 * its tree and flattens to stamped layers on demand. `theme` flows down to
 * descendants that don't set their own; `iml.group` provenance flows up.
 * Immutable — every method returns a new group.
 */
export class Group {
  /**
   * @param {string | undefined} name The group's provenance name, prepended to
   *   each descendant's `iml.group` path. `undefined` for an anonymous structural
   *   container, which stamps nothing.
   * @param {GroupChild[]} children
   * @param {GroupConfig} [config]
   */
  constructor(name, children, config = {}) {
    this.name = name
    this.children = children
    this.config = config
  }

  /**
   * Returns a new group with `overrides` merged over this group's config.
   *
   * @param {Partial<GroupConfig>} overrides
   * @returns {Group}
   */
  copy(overrides) {
    return new Group(this.name, this.children, { ...this.config, ...overrides })
  }

  /**
   * Returns a new group with `theme` shallow-merged over this group's, inherited
   * by every descendant that doesn't set its own.
   *
   * @param {Theme} theme
   * @returns {Group}
   */
  theme(theme) {
    return this.copy({ theme: { ...this.config.theme, ...theme } })
  }

  /**
   * Returns a new group carrying the given source lookup, merged into any already
   * carried. Optional — a group with no lookup still builds, omitting from its
   * document any source a layer references but the lookup can't resolve.
   *
   * @param {Record<string, object>} sources
   * @returns {Group}
   */
  resources(sources) {
    return this.copy({ sources: { ...this.config.sources, ...sources } })
  }

  /**
   * Returns a new group carrying the given document-envelope fields (`name`,
   * `metadata`), so a root group's `.toGlStyle()` needs no args.
   *
   * @param {DocumentFields} document
   * @returns {Group}
   */
  document(document) {
    return this.copy({ document: { ...this.config.document, ...document } })
  }

  /**
   * Returns a new group with `children` appended after this group's own.
   *
   * @param {...GroupChild} children
   * @returns {Group}
   */
  append(...children) {
    return new Group(this.name, [...this.children, ...children], this.config)
  }

  /**
   * Returns a new group with `children` prepended before this group's own.
   *
   * @param {...GroupChild} children
   * @returns {Group}
   */
  prepend(...children) {
    return new Group(this.name, [...children, ...this.children], this.config)
  }

  /**
   * The name of every named group node in this subtree, including this one, depth
   * first. Empty groups (all leaves pruned) still appear — discovery reports what
   * is refinable, not what survives to a built layer.
   *
   * @returns {string[]}
   */
  groupNames() {
    return groupNodes(this)
      .map((node) => node.name)
      .filter((name) => name !== undefined)
  }

  /**
   * The name of every style leaf in this subtree, in tree order, with duplicates
   * and nameless leaves dropped.
   *
   * @returns {string[]}
   */
  styleNames() {
    const names = styleLeaves(this)
      .map((leaf) => leaf.name)
      .filter((name) => name !== undefined)

    return [...new Set(names)]
  }

  /**
   * A human-readable, indented tree of group and style names for console
   * inspection — the companion to name-based refinement. Returned, not logged.
   *
   * @returns {string}
   */
  describe() {
    const lines = []

    const walk = (node, depth) => {
      const indent = "  ".repeat(depth)

      if (node instanceof Group) {
        lines.push(`${indent}${node.name ?? "(anonymous)"}`)
        node.children.forEach((child) => walk(child, depth + 1))
      } else {
        lines.push(`${indent}${node.name ?? "(anonymous)"}`)
      }
    }

    walk(this, 0)

    return lines.join("\n")
  }

  /**
   * Returns a new group with every named group node in the subtree matching `pred`
   * pruned (with its whole subtree). A node-drop: `pred` sees the {@link Group}.
   *
   * @param {(group: Group) => boolean} pred
   * @returns {Group}
   */
  omitGroupsBy(pred) {
    const children = this.children
      .filter((child) => !(child instanceof Group) || !pred(child))
      .map((child) => (child instanceof Group ? child.omitGroupsBy(pred) : child))

    return new Group(this.name, children, this.config)
  }

  /**
   * Returns a new group keeping only the subtrees rooted at a group node matching
   * `pred`, whole, plus the ancestor path leading to each. Style leaves not under a
   * kept group are dropped; a matched group keeps all its descendants.
   *
   * @param {(group: Group) => boolean} pred
   * @returns {Group}
   */
  pickGroupsBy(pred) {
    const children = this.children.flatMap((child) => {
      if (!(child instanceof Group)) {
        return []
      }

      if (pred(child)) {
        return [child]
      }

      const picked = child.pickGroupsBy(pred)

      return picked.children.length > 0 ? [picked] : []
    })

    return new Group(this.name, children, this.config)
  }

  /**
   * Returns a new group with the named groups pruned, wherever they nest. Each
   * name (a string, or an instance's `.name`) must match a group in the current
   * tree; an unmatched name throws, guarding typos and double-removes.
   *
   * @param {...(string | Group)} groups
   * @returns {Group}
   */
  omitGroups(...groups) {
    const names = new Set(groups.map((group) => nameOf(group, "group")))
    const present = new Set(this.groupNames())

    for (const name of names) {
      if (!present.has(name)) {
        throw new Error(`no group named "${name}" to omit`)
      }
    }

    return this.omitGroupsBy((group) => names.has(group.name))
  }

  /**
   * Returns a new group keeping only the named group subtrees, whole. Each name
   * must match a group in the current tree; an unmatched name throws.
   *
   * @param {...(string | Group)} groups
   * @returns {Group}
   */
  pickGroups(...groups) {
    const names = new Set(groups.map((group) => nameOf(group, "group")))
    const present = new Set(this.groupNames())

    for (const name of names) {
      if (!present.has(name)) {
        throw new Error(`no group named "${name}" to pick`)
      }
    }

    return this.pickGroupsBy((group) => names.has(group.name))
  }

  /**
   * Returns a new group with every style leaf matching `pred` pruned, wherever it
   * sits. Tree shape is preserved: a group emptied of leaves stays, contributing
   * no layers. `pred` sees the style {@link Builder} handle.
   *
   * @param {(style: Builder) => boolean} pred
   * @returns {Group}
   */
  omitStylesBy(pred) {
    const children = this.children
      .filter((child) => child instanceof Group || !pred(child))
      .map((child) => (child instanceof Group ? child.omitStylesBy(pred) : child))

    return new Group(this.name, children, this.config)
  }

  /**
   * Returns a new group keeping only the style leaves matching `pred`. Tree shape
   * is preserved.
   *
   * @param {(style: Builder) => boolean} pred
   * @returns {Group}
   */
  pickStylesBy(pred) {
    return this.omitStylesBy((style) => !pred(style))
  }

  /**
   * Returns a new group with the named styles' leaves pruned, wherever they sit.
   * Each name (a string, or an instance's `.name`) must match a style leaf in the
   * current tree; an unmatched name throws.
   *
   * @param {...(string | Builder)} styles
   * @returns {Group}
   */
  omitStyles(...styles) {
    const names = new Set(styles.map((style) => nameOf(style, "style")))
    const present = new Set(this.styleNames())

    for (const name of names) {
      if (!present.has(name)) {
        throw new Error(`no style named "${name}" to omit`)
      }
    }

    return this.omitStylesBy((style) => names.has(style.name))
  }

  /**
   * Returns a new group keeping only the named styles' leaves. Each name must
   * match a style leaf in the current tree; an unmatched name throws.
   *
   * @param {...(string | Builder)} styles
   * @returns {Group}
   */
  pickStyles(...styles) {
    const names = new Set(styles.map((style) => nameOf(style, "style")))
    const present = new Set(this.styleNames())

    for (const name of names) {
      if (!present.has(name)) {
        throw new Error(`no style named "${name}" to pick`)
      }
    }

    return this.pickStylesBy((style) => names.has(style.name))
  }

  /**
   * The resolved source definitions this group's built layers reference, keyed by
   * source name, for the imperative `map.addSource(name, def)` path. Only names the
   * carried lookup can resolve appear; unresolved ones are the consumer's to load.
   *
   * @returns {Record<string, object>}
   */
  getSources() {
    return resolveSources(gatherSources(this), this.build())
  }

  /**
   * The glyphs URL this group's layers need, or `undefined` if none render text,
   * for the imperative `map.setGlyphs(url)` path.
   *
   * @returns {string | undefined}
   */
  getGlyphsUrl() {
    return needsGlyphs(this.build()) ? GLYPHS_URL : undefined
  }

  /**
   * The sprite URL this group's layers need, or `undefined` if none render an
   * icon, for the imperative sprite-loading path.
   *
   * @returns {string | undefined}
   */
  getSpriteUrl() {
    return needsSprite(this.build()) ? SPRITE_URL : undefined
  }

  /**
   * Walks the tree once: pushes inherited config into each child, builds it, runs
   * post-processors over the built layers, stamps `iml.group`, and returns them
   * concatenated in order (order = z-order).
   *
   * @returns {ResolvedLayer[]}
   */
  build() {
    const base = inheritable(this.config)

    const built = this.children.flatMap((child) => {
      if (child instanceof Group) {
        return child.under(this.config).build()
      }

      return child.inherit(base).build()
    })

    const processed = (this.config.post ?? []).reduce((layers, post) => post(layers), built)

    return stampGroup(processed, this.name)
  }

  /**
   * Returns a copy of this group with `parent`'s `theme` merged underneath its
   * own, so this group's theme wins and unset fields fill from the parent. Used
   * when nesting: the enclosing group seeds this one.
   *
   * @param {GroupConfig} parent
   * @returns {Group}
   */
  under(parent) {
    if (parent.theme === undefined && this.config.theme === undefined) {
      return this
    }

    return this.copy({ theme: { ...parent.theme, ...this.config.theme } })
  }

  /**
   * Resolves the tree to a complete GL style document. Sources are derived: only
   * definitions a built layer references by `source` are emitted. Glyphs and
   * sprite are included only when a layer needs them.
   *
   * @returns {object}
   */
  toGlStyle() {
    const { version, name, metadata } = this.config.document ?? {}
    const layers = this.build()

    const glyphs = needsGlyphs(layers) ? GLYPHS_URL : undefined
    const sprite = needsSprite(layers) ? SPRITE_URL : undefined

    return {
      version: version ?? 8,
      ...(name !== undefined && { name }),
      ...(glyphs !== undefined && { glyphs }),
      ...(sprite !== undefined && { sprite }),
      ...(metadata !== undefined && { metadata }),
      sources: resolveSources(gatherSources(this), layers),
      layers,
    }
  }
}

/**
 * Creates a {@link Group}: an ordered set of children (styles or sub-groups) with
 * optional `theme`, `sources`, `document`, and `post` config.
 *
 * The name is optional. A named group is a provenance level — its name is stamped
 * into each descendant layer's `iml.group` path. An anonymous group (name
 * omitted) is a structural container only: it stamps nothing, so a consumer's
 * throwaway wrapper doesn't pollute library provenance.
 *
 * @overload
 * @param {string} name
 * @param {GroupChild[]} children
 * @param {GroupConfig} [config]
 * @returns {Group}
 *
 * @overload
 * @param {GroupChild[]} children
 * @param {GroupConfig} [config]
 * @returns {Group}
 *
 * @param {string | GroupChild[]} nameOrChildren
 * @param {GroupChild[] | GroupConfig} [childrenOrConfig]
 * @param {GroupConfig} [config]
 * @returns {Group}
 */
export const group = (nameOrChildren, childrenOrConfig, config) => {
  if (typeof nameOrChildren === "string") {
    return new Group(nameOrChildren, /** @type {GroupChild[]} */ (childrenOrConfig ?? []), config ?? {})
  }

  return new Group(undefined, nameOrChildren, /** @type {GroupConfig} */ (childrenOrConfig ?? {}))
}
