import { Builder } from "./style.js"
import { applyResources, applyLayers, glStyle } from "../adapters/maplibre.js"

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
 * A group or style in the tree, as passed to a {@link Matcher} function.
 *
 * @typedef {{ kind: "group", name: string | undefined, group: Group }
 *   | { kind: "style", name: string | undefined, style: Builder }} MatchNode
 */

/**
 * Chooses nodes for {@link Group#remove} or {@link Group#pick}. A name matches
 * any group or style with that name, anywhere in the tree.
 *
 * @typedef {string | ((node: MatchNode) => boolean)} Matcher
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
 * layers on demand. Immutable: every method returns a new group. Prefer the
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
  #copy(overrides) {
    return new Group(this.name, this.children, { ...this.config, ...overrides })
  }

  /**
   * A new group with `theme` merged over its own.
   *
   * @param {Theme} theme
   */
  theme(theme) {
    return this.#copy({ theme: { ...this.config.theme, ...theme } })
  }

  get resources() {
    return this.config.resources
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
   * A new group with the matched groups and styles removed, wherever they nest.
   * A removed group takes its whole subtree; a removed style's leaves are pruned
   * while the tree shape is kept (an emptied group stays, contributing no layers).
   *
   * A matcher is a name — matching a group or a style anywhere in the subtree — or
   * a predicate over a tagged node ({@link MatchNode}). A name matching neither
   * a group nor a style throws, guarding against typos.
   *
   * @example
   * ```js
   * Roads.remove("Railways")                                  // a group + its subtree
   * Roads.remove("RoadMotorway")                                  // a style, wherever it sits
   * Roads.remove("Railways", "RoadMotorway")                      // several
   * Roads.remove((node) => node.kind === "style" && node.name.startsWith("Place"))
   * ```
   *
   * @param {...Matcher} matchers
   */
  remove(...matchers) {
    const { groupMatches, styleMatches } = this.#compileMatchers(matchers, "remove")

    return this.#removeMatching(groupMatches, styleMatches)
  }

  /**
   * A new group with only the matched groups and styles. The groups around a
   * pick are kept, so its provenance, theme and post-processors still apply.
   *
   * @example
   * ```js
   * Graphics.pick("Water", "RoadMotorway")    // Water's subtree + motorways inside Roads
   * Graphics.pick((node) => node.kind === "style" && node.name.startsWith("Label"))
   * ```
   *
   * @param {...Matcher} matchers
   */
  pick(...matchers) {
    const { groupMatches, styleMatches } = this.#compileMatchers(matchers, "pick")

    return this.#pickMatching(groupMatches, styleMatches)
  }

  /**
   * @param {Matcher[]} matchers
   * @param {string} verb
   */
  #compileMatchers(matchers, verb) {
    const names = matchers.filter((matcher) => typeof matcher === "string")
    const predicates = matchers.filter((matcher) => typeof matcher === "function")

    const present = new Set([
      ...groupNodes(this).map((node) => node.name),
      ...styleLeaves(this).map((leaf) => leaf.name),
    ])

    for (const name of names) {
      if (!present.has(name)) {
        throw new Error(`no group or style named "${name}" to ${verb}`)
      }
    }

    /** @type {Set<string | undefined>} */
    const nameSet = new Set(names)

    /** @param {Group} group */
    const groupMatches = (group) => {
      if (nameSet.has(group.name)) {
        return true
      }

      return predicates.some((pred) => pred({ kind: "group", name: group.name, group }))
    }

    /** @param {Builder} style */
    const styleMatches = (style) => {
      if (nameSet.has(style.name)) {
        return true
      }

      return predicates.some((pred) => pred({ kind: "style", name: style.name, style }))
    }

    return { groupMatches, styleMatches }
  }

  /**
   * A new group with matched sub-groups dropped whole and matched style leaves
   * pruned, applied recursively.
   *
   * @param {(group: Group) => boolean} groupMatches
   * @param {(style: Builder) => boolean} styleMatches
   * @returns {Group}
   */
  #removeMatching(groupMatches, styleMatches) {
    const children = this.children.flatMap(/** @returns {GroupChild[]} */ (child) => {
      if (child instanceof Group) {
        if (groupMatches(child)) {
          return []
        }

        return [child.#removeMatching(groupMatches, styleMatches)]
      }

      if (styleMatches(child)) {
        return []
      }

      return [child]
    })

    return new Group(this.name, children, this.config)
  }

  /**
   * @param {(group: Group) => boolean} groupMatches
   * @param {(style: Builder) => boolean} styleMatches
   * @returns {Group}
   */
  #pickMatching(groupMatches, styleMatches) {
    const children = this.children.flatMap(/** @returns {GroupChild[]} */ (child) => {
      if (!(child instanceof Group)) {
        if (styleMatches(child)) {
          return [child]
        }

        return []
      }

      if (groupMatches(child)) {
        return [child]
      }

      const picked = child.#pickMatching(groupMatches, styleMatches)

      if (picked.children.length === 0) {
        return []
      }

      return [picked]
    })

    return new Group(this.name, children, this.config)
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

      lines.push(`${indent}${node.name ?? "(anonymous)"}`)

      if (node instanceof Group) {
        node.children.forEach((child) => walk(child, depth + 1))
      }
    }

    walk(this, 0)

    return lines.join("\n")
  }

  /**
   * Flattens the tree to layers in z-order (an escape hatch below the
   * `render.<target>` path): pushes inherited config into each child, builds it,
   * stamps `iml.group`, and runs post-processors over the finished layers.
   *
   * @returns {ResolvedLayer[]}
   */
  layers() {
    const base = inheritable(this.config)

    const built = this.children.flatMap((child) => {
      if (child instanceof Group) {
        return child.#inheritFrom(this.config).layers()
      }

      return child.inherit(base).build()
    })

    let layers = stampGroup(built, this.name)

    for (const post of this.config.post ?? []) {
      layers = post(layers)
    }

    return layers
  }

  /**
   * A copy with `parent`'s theme merged underneath its own and its resources
   * inherited where unset, so this group's own values win.
   *
   * @param {GroupConfig} parent
   */
  #inheritFrom(parent) {
    return this.#copy({
      theme: { ...parent.theme, ...this.config.theme },
      resources: this.config.resources ?? parent.resources,
    })
  }

  /**
   * Renders the group for a target, keyed by map library. A member taking a live
   * map instance mounts onto it (adding its sources, glyphs, sprite and layers)
   * and returns nothing; `glStyle` takes no map and returns a GL style document.
   *
   * @example
   * ```js
   * Roads.render.maplibre(map)   // onto a live MapLibre instance
   * Roads.render.glStyle()       // as a GL style document, for a map constructor
   * ```
   */
  get render() {
    return {
      maplibre: (map) => {
        const layers = this.layers()

        if (this.config.resources !== undefined) {
          applyResources(map, this.config.resources)
        }

        applyLayers(map, layers)
      },
      glStyle: () => glStyle(this.layers(), this.config.resources, this.config.document),
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
 * group("Water", [WaterWaterway, WaterOcean], { resources })
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
    return new Group(
      nameOrChildren,
      /** @type {GroupChild[]} */ (childrenOrConfig ?? []),
      config ?? {},
    )
  }

  return new Group(undefined, nameOrChildren, /** @type {GroupConfig} */ (childrenOrConfig ?? {}))
}
