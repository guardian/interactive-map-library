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
    constructor(name: string | undefined, children: GroupChild[], config?: GroupConfig);
    name: string;
    children: GroupChild[];
    config: GroupConfig;
    /**
     * A new group with `overrides` merged over its config.
     *
     * @param {Partial<GroupConfig>} overrides
     */
    copy(overrides: Partial<GroupConfig>): Group;
    /**
     * A new group with `theme` merged over its own.
     *
     * @param {Theme} theme
     */
    theme(theme: Theme): Group;
    /**
     * A new group carrying the given source definitions, merged into any already
     * carried.
     *
     * @param {Record<string, object>} sources
     */
    resources(sources: Record<string, object>): Group;
    /**
     * A new group carrying the given document fields, so a root group's
     * `.toGlStyle()` needs no args.
     *
     * @param {DocumentFields} document
     */
    document(document: DocumentFields): Group;
    /**
     * A new group with `children` appended after its own.
     *
     * @param {...GroupChild} children
     */
    append(...children: GroupChild[]): Group;
    /**
     * A new group with `children` prepended before its own.
     *
     * @param {...GroupChild} children
     */
    prepend(...children: GroupChild[]): Group;
    /**
     * The names of every named group in this subtree, including this one. Reports
     * the tree, so an emptied group still appears.
     *
     * @returns {string[]}
     */
    groupNames(): string[];
    /**
     * The names of every style leaf in this subtree, deduplicated.
     *
     * @returns {string[]}
     */
    styleNames(): string[];
    /**
     * An indented tree of group and style names, returned (not logged) for
     * inspection.
     *
     * @returns {string}
     */
    describe(): string;
    /**
     * A new group with every group matching `pred` pruned, along with its subtree.
     *
     * @param {(group: Group) => boolean} pred
     */
    omitGroupsBy(pred: (group: Group) => boolean): any;
    /**
     * A new group keeping only the subtrees rooted at a group matching `pred`, plus
     * the ancestor path to each. Leaves not under a kept group are dropped.
     *
     * @param {(group: Group) => boolean} pred
     */
    pickGroupsBy(pred: (group: Group) => boolean): any;
    /**
     * A new group with the named groups pruned, wherever they nest. A name is a
     * string or a group's `.name`; an unmatched name throws.
     *
     * @param {...(string | Group)} groups
     */
    omitGroups(...groups: (string | Group)[]): any;
    /**
     * A new group keeping only the named group subtrees. An unmatched name throws.
     *
     * @param {...(string | Group)} groups
     */
    pickGroups(...groups: (string | Group)[]): any;
    /**
     * A new group with every style leaf matching `pred` pruned. Tree shape is
     * preserved: an emptied group stays, contributing no layers.
     *
     * @param {(style: Builder) => boolean} pred
     */
    omitStylesBy(pred: (style: Builder) => boolean): any;
    /**
     * A new group keeping only the style leaves matching `pred`.
     *
     * @param {(style: Builder) => boolean} pred
     */
    pickStylesBy(pred: (style: Builder) => boolean): any;
    /**
     * A new group with the named styles' leaves pruned, wherever they sit. A name is
     * a string or a style's `.name`; an unmatched name throws.
     *
     * @param {...(string | Builder)} styles
     */
    omitStyles(...styles: (string | Builder)[]): any;
    /**
     * A new group keeping only the named styles' leaves. An unmatched name throws.
     *
     * @param {...(string | Builder)} styles
     */
    pickStyles(...styles: (string | Builder)[]): any;
    /**
     * The source definitions this group's layers reference, keyed by name, for the
     * imperative `map.addSource(name, def)` path.
     *
     * @returns {Record<string, object>}
     */
    getSources(): Record<string, object>;
    /**
     * The glyphs URL this group's layers need, or `undefined` if none render text,
     * for the imperative `map.setGlyphs(url)` path.
     *
     * @returns {string | undefined}
     */
    getGlyphsUrl(): string | undefined;
    /**
     * The sprite URL this group's layers need, or `undefined` if none render an
     * icon.
     *
     * @returns {string | undefined}
     */
    getSpriteUrl(): string | undefined;
    /**
     * Flattens the tree to layers in z-order: pushes inherited config into each
     * child, builds it, runs post-processors, and stamps `iml.group`.
     *
     * @returns {ResolvedLayer[]}
     */
    build(): ResolvedLayer[];
    /**
     * A copy with `parent`'s `theme` merged underneath its own, so this group's
     * theme wins and unset fields fill from the parent.
     *
     * @param {GroupConfig} parent
     */
    under(parent: GroupConfig): Group;
    /**
     * Resolves the tree to a complete GL style document. Sources, glyphs and sprite
     * are derived from the built layers, emitted only when referenced.
     *
     * @returns {object}
     */
    toGlStyle(): object;
}
/**
 * Creates a {@link Group}. The name is optional: a named group stamps its name
 * into each descendant layer's `iml.group` path, while an anonymous one stamps
 * nothing.
 *
 * @example
 * ```js
 * group("Water", [Waterway, Ocean], { sources })
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
export function group(name: string, children: GroupChild[], config?: GroupConfig): Group;
/**
 * Creates a {@link Group}. The name is optional: a named group stamps its name
 * into each descendant layer's `iml.group` path, while an anonymous one stamps
 * nothing.
 *
 * @example
 * ```js
 * group("Water", [Waterway, Ocean], { sources })
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
export function group(children: GroupChild[], config?: GroupConfig): Group;
/**
 * A child of a group: another {@link Group}, or a style {@link Builder}.
 */
export type GroupChild = Group | Builder;
/**
 * Reorders a group's built layers before they are concatenated, eg. drawing
 * casings before fills.
 */
export type PostProcessor = (layers: ResolvedLayer[]) => ResolvedLayer[];
/**
 * Document-envelope fields, meaningful only at a root group.
 */
export type DocumentFields = {
    version?: number;
    name?: string;
    metadata?: object;
};
/**
 * A group's config. `theme` flows down to descendants that don't set their own;
 * `sources` merges across the whole subtree, the shallower definition winning on
 * a name conflict.
 */
export type GroupConfig = {
    theme?: Theme;
    /**
     * Source definitions keyed by name.
     */
    sources?: Record<string, object>;
    document?: DocumentFields;
    post?: PostProcessor[];
};
import type { Theme } from "./style.js";
import { Builder } from "./style.js";
import type { ResolvedLayer } from "./style.js";
