import { Builder } from "./style.js"
import { needsGlyphs, needsSprite } from "./resources.js"

/**
 * @import { ResolvedLayer, StyleConfig, Theme } from "./style.js"
 * @import { Resources } from "./resources.js"
 */

/**
 * A child of a group: another {@link Group}, or a style {@link Builder}.
 *
 * @typedef {Group | Builder} GroupChild
 */

/**
 * Reorders a group's built layers before they are concatenated, eg. drawing
 * casings before fills.
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
 * A group's config. `theme` and `resources` flow down to descendants that don't
 * set their own.
 *
 * @typedef {object} GroupConfig
 * @property {Theme} [theme]
 * @property {Resources} [resources] The externals its layers reference.
 * @property {DocumentFields} [document]
 * @property {PostProcessor[]} [post]
 */

/**
 * Prepends `name` to each layer's `iml.group` path.
 *
 * @param {ResolvedLayer[]} layers
 * @param {string} name
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
 * The part of a group's config a child builder inherits.
 *
 * @param {GroupConfig} config
 * @returns {StyleConfig}
 */
const inheritable = (config) => ({ theme: config.theme })

/**
 * The name an omit/pick argument matches on. A nameless instance throws, since
 * identity matching belongs to the `...By` variants.
 *
 * @param {string | { name?: string }} arg
 * @param {string} axis "group" or "style", for the error message
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
 * The subset of `lookup` that `layers` reference by `source` name.
 *
 * @param {Record<string, object>} lookup
 * @param {ResolvedLayer[]} layers
 */
const resolveSources = (lookup, layers) => {
  const referenced = new Set(layers.map((layer) => layer.source).filter(Boolean))

  return Object.fromEntries(Object.entries(lookup).filter(([name]) => referenced.has(name)))
}

/**
 * `root` and its descendant group nodes, depth first.
 *
 * @param {Group} root
 * @returns {Group[]}
 */
const groupNodes = (root) => {
  const nested = root.children.filter((child) => child instanceof Group)

  return [root, ...nested.flatMap((child) => groupNodes(/** @type {Group} */ (child)))]
}

/**
 * Every style leaf under `root`, in tree order.
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
 * An ordered, nestable set of children (styles or sub-groups) that flattens to
 * layers on demand. Immutable — every method returns a new group. Prefer the
 * {@link group} factory to constructing directly.
 */
export class Group {
  /**
   * @param {string | undefined} name Prepended to each descendant's `iml.group`
   *   path. `undefined` for an anonymous group, which stamps nothing.
   * @param {GroupChild[]} children
   * @param {GroupConfig} [config]
   */
  constructor(name, children, config = {}) {
    this.name = name
    this.children = children
    this.config = config
  }

  /**
   * A new group with `overrides` merged over its config.
   *
   * @param {Partial<GroupConfig>} overrides
   */
  copy(overrides) {
    return new Group(this.name, this.children, { ...this.config, ...overrides })
  }

  /**
   * A new group with `theme` merged over its own.
   *
   * @param {Theme} theme
   */
  theme(theme) {
    return this.copy({ theme: { ...this.config.theme, ...theme } })
  }

  /**
   * A new group carrying the given resources, from which its layers' sources,
   * glyphs and sprite are resolved.
   *
   * @param {Resources} resources
   */
  withResources(resources) {
    return this.copy({ resources })
  }

  /**
   * A new group carrying the given document fields, so a root group's
   * `.toGlStyle()` needs no args.
   *
   * @param {DocumentFields} document
   */
  document(document) {
    return this.copy({ document: { ...this.config.document, ...document } })
  }

  /**
   * A new group with `children` appended after its own.
   *
   * @param {...GroupChild} children
   */
  append(...children) {
    return new Group(this.name, [...this.children, ...children], this.config)
  }

  /**
   * A new group with `children` prepended before its own.
   *
   * @param {...GroupChild} children
   */
  prepend(...children) {
    return new Group(this.name, [...children, ...this.children], this.config)
  }

  /**
   * The names of every named group in this subtree, including this one. Reports
   * the tree, so an emptied group still appears.
   *
   * @returns {string[]}
   */
  groupNames() {
    return groupNodes(this)
      .map((node) => node.name)
      .filter((name) => name !== undefined)
  }

  /**
   * The names of every style leaf in this subtree, deduplicated.
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
   * An indented tree of group and style names, returned (not logged) for
   * inspection.
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
   * A new group with every group matching `pred` pruned, along with its subtree.
   *
   * @param {(group: Group) => boolean} pred
   */
  omitGroupsBy(pred) {
    const children = this.children
      .filter((child) => !(child instanceof Group) || !pred(child))
      .map((child) => (child instanceof Group ? child.omitGroupsBy(pred) : child))

    return new Group(this.name, children, this.config)
  }

  /**
   * A new group keeping only the subtrees rooted at a group matching `pred`, plus
   * the ancestor path to each. Leaves not under a kept group are dropped.
   *
   * @param {(group: Group) => boolean} pred
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
   * A new group with the named groups pruned, wherever they nest. A name is a
   * string or a group's `.name`; an unmatched name throws.
   *
   * @param {...(string | Group)} groups
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
   * A new group keeping only the named group subtrees. An unmatched name throws.
   *
   * @param {...(string | Group)} groups
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
   * A new group with every style leaf matching `pred` pruned. Tree shape is
   * preserved: an emptied group stays, contributing no layers.
   *
   * @param {(style: Builder) => boolean} pred
   */
  omitStylesBy(pred) {
    const children = this.children
      .filter((child) => child instanceof Group || !pred(child))
      .map((child) => (child instanceof Group ? child.omitStylesBy(pred) : child))

    return new Group(this.name, children, this.config)
  }

  /**
   * A new group keeping only the style leaves matching `pred`.
   *
   * @param {(style: Builder) => boolean} pred
   */
  pickStylesBy(pred) {
    return this.omitStylesBy((style) => !pred(style))
  }

  /**
   * A new group with the named styles' leaves pruned, wherever they sit. A name is
   * a string or a style's `.name`; an unmatched name throws.
   *
   * @param {...(string | Builder)} styles
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
   * A new group keeping only the named styles' leaves. An unmatched name throws.
   *
   * @param {...(string | Builder)} styles
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
   * The source definitions this group's layers reference, keyed by name, for the
   * imperative `map.addSource(name, def)` path.
   *
   * @returns {Record<string, object>}
   */
  getSources() {
    return resolveSources(this.config.resources?.sources ?? {}, this.build())
  }

  /**
   * The glyphs URL this group's layers need, or `undefined` if none render text,
   * for the imperative `map.setGlyphs(url)` path.
   *
   * @returns {string | undefined}
   */
  getGlyphsUrl() {
    return needsGlyphs(this.build()) ? this.config.resources?.glyphs : undefined
  }

  /**
   * The sprite URL this group's layers need, or `undefined` if none render an
   * icon.
   *
   * @returns {string | undefined}
   */
  getSpriteUrl() {
    return needsSprite(this.build()) ? this.config.resources?.sprite : undefined
  }

  /**
   * Flattens the tree to layers in z-order: pushes inherited config into each
   * child, builds it, runs post-processors, and stamps `iml.group`.
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
   * A copy with `parent`'s `theme` merged underneath its own and its `resources`
   * inherited where unset, so this group's own values win.
   *
   * @param {GroupConfig} parent
   */
  under(parent) {
    const inheritsTheme = parent.theme !== undefined
    const inheritsResources = parent.resources !== undefined && this.config.resources === undefined

    if (!inheritsTheme && !inheritsResources) {
      return this
    }

    return this.copy({
      theme: { ...parent.theme, ...this.config.theme },
      resources: this.config.resources ?? parent.resources,
    })
  }

  /**
   * Resolves the tree to a complete GL style document. Sources, glyphs and sprite
   * are derived from the built layers, emitted only when referenced.
   *
   * @returns {object}
   */
  toGlStyle() {
    const { version, name, metadata } = this.config.document ?? {}
    const resources = this.config.resources
    const layers = this.build()

    const glyphs = needsGlyphs(layers) ? resources?.glyphs : undefined
    const sprite = needsSprite(layers) ? resources?.sprite : undefined

    return {
      version: version ?? 8,
      ...(name !== undefined && { name }),
      ...(glyphs !== undefined && { glyphs }),
      ...(sprite !== undefined && { sprite }),
      ...(metadata !== undefined && { metadata }),
      sources: resolveSources(resources?.sources ?? {}, layers),
      layers,
    }
  }
}

/**
 * Creates a {@link Group}. The name is optional: a named group stamps its name
 * into each descendant layer's `iml.group` path, while an anonymous one stamps
 * nothing.
 *
 * @example
 * ```js
 * group("Water", [Waterway, Ocean], { resources })
 * group([Water, Roads]) // anonymous, structural
 * ```
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
