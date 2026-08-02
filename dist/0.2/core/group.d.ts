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
    constructor(name: string | undefined, children: GroupChild[], config?: GroupConfig);
    name: string;
    children: GroupChild[];
    config: GroupConfig;
    /**
     * Returns a new group with `overrides` merged over this group's config.
     *
     * @param {Partial<GroupConfig>} overrides
     * @returns {Group}
     */
    copy(overrides: Partial<GroupConfig>): Group;
    /**
     * Returns a new group with `theme` shallow-merged over this group's, inherited
     * by every descendant that doesn't set its own.
     *
     * @param {Theme} theme
     * @returns {Group}
     */
    theme(theme: Theme): Group;
    /**
     * Returns a new group carrying the given source lookup, merged into any already
     * carried. Optional — a group with no lookup still builds, omitting from its
     * document any source a layer references but the lookup can't resolve.
     *
     * @param {Record<string, object>} sources
     * @returns {Group}
     */
    resources(sources: Record<string, object>): Group;
    /**
     * Returns a new group carrying the given document-envelope fields (`name`,
     * `metadata`), so a root group's `.toGlStyle()` needs no args.
     *
     * @param {DocumentFields} document
     * @returns {Group}
     */
    document(document: DocumentFields): Group;
    /**
     * Returns a new group with `children` appended after this group's own.
     *
     * @param {...GroupChild} children
     * @returns {Group}
     */
    append(...children: GroupChild[]): Group;
    /**
     * Returns a new group with `children` prepended before this group's own.
     *
     * @param {...GroupChild} children
     * @returns {Group}
     */
    prepend(...children: GroupChild[]): Group;
    /**
     * The name of every named group node in this subtree, including this one, depth
     * first. Empty groups (all leaves pruned) still appear — discovery reports what
     * is refinable, not what survives to a built layer.
     *
     * @returns {string[]}
     */
    groupNames(): string[];
    /**
     * The name of every style leaf in this subtree, in tree order, with duplicates
     * and nameless leaves dropped.
     *
     * @returns {string[]}
     */
    styleNames(): string[];
    /**
     * A human-readable, indented tree of group and style names for console
     * inspection — the companion to name-based refinement. Returned, not logged.
     *
     * @returns {string}
     */
    describe(): string;
    /**
     * Returns a new group with every named group node in the subtree matching `pred`
     * pruned (with its whole subtree). A node-drop: `pred` sees the {@link Group}.
     *
     * @param {(group: Group) => boolean} pred
     * @returns {Group}
     */
    omitGroupsBy(pred: (group: Group) => boolean): Group;
    /**
     * Returns a new group keeping only the subtrees rooted at a group node matching
     * `pred`, whole, plus the ancestor path leading to each. Style leaves not under a
     * kept group are dropped; a matched group keeps all its descendants.
     *
     * @param {(group: Group) => boolean} pred
     * @returns {Group}
     */
    pickGroupsBy(pred: (group: Group) => boolean): Group;
    /**
     * Returns a new group with the named groups pruned, wherever they nest. Each
     * name (a string, or an instance's `.name`) must match a group in the current
     * tree; an unmatched name throws, guarding typos and double-removes.
     *
     * @param {...(string | Group)} groups
     * @returns {Group}
     */
    omitGroups(...groups: (string | Group)[]): Group;
    /**
     * Returns a new group keeping only the named group subtrees, whole. Each name
     * must match a group in the current tree; an unmatched name throws.
     *
     * @param {...(string | Group)} groups
     * @returns {Group}
     */
    pickGroups(...groups: (string | Group)[]): Group;
    /**
     * Returns a new group with every style leaf matching `pred` pruned, wherever it
     * sits. Tree shape is preserved: a group emptied of leaves stays, contributing
     * no layers. `pred` sees the style {@link Builder} handle.
     *
     * @param {(style: Builder) => boolean} pred
     * @returns {Group}
     */
    omitStylesBy(pred: (style: Builder) => boolean): Group;
    /**
     * Returns a new group keeping only the style leaves matching `pred`. Tree shape
     * is preserved.
     *
     * @param {(style: Builder) => boolean} pred
     * @returns {Group}
     */
    pickStylesBy(pred: (style: Builder) => boolean): Group;
    /**
     * Returns a new group with the named styles' leaves pruned, wherever they sit.
     * Each name (a string, or an instance's `.name`) must match a style leaf in the
     * current tree; an unmatched name throws.
     *
     * @param {...(string | Builder)} styles
     * @returns {Group}
     */
    omitStyles(...styles: (string | Builder)[]): Group;
    /**
     * Returns a new group keeping only the named styles' leaves. Each name must
     * match a style leaf in the current tree; an unmatched name throws.
     *
     * @param {...(string | Builder)} styles
     * @returns {Group}
     */
    pickStyles(...styles: (string | Builder)[]): Group;
    /**
     * The resolved source definitions this group's built layers reference, keyed by
     * source name, for the imperative `map.addSource(name, def)` path. Only names the
     * carried lookup can resolve appear; unresolved ones are the consumer's to load.
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
     * icon, for the imperative sprite-loading path.
     *
     * @returns {string | undefined}
     */
    getSpriteUrl(): string | undefined;
    /**
     * Walks the tree once: pushes inherited config into each child, builds it, runs
     * post-processors over the built layers, stamps `iml.group`, and returns them
     * concatenated in order (order = z-order).
     *
     * @returns {ResolvedLayer[]}
     */
    build(): ResolvedLayer[];
    /**
     * Returns a copy of this group with `parent`'s `theme` merged underneath its
     * own, so this group's theme wins and unset fields fill from the parent. Used
     * when nesting: the enclosing group seeds this one.
     *
     * @param {GroupConfig} parent
     * @returns {Group}
     */
    under(parent: GroupConfig): Group;
    /**
     * Resolves the tree to a complete GL style document. Sources are derived: only
     * definitions a built layer references by `source` are emitted. Glyphs and
     * sprite are included only when a layer needs them.
     *
     * @returns {object}
     */
    toGlStyle(): object;
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
export function group(name: string, children: GroupChild[], config?: GroupConfig): Group;
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
export function group(children: GroupChild[], config?: GroupConfig): Group;
/**
 * A child of a group: another {@link Group}, or a style {@link Builder} (an
 * `.apply(...)` result). Both resolve to stamped layers via `.build`.
 */
export type GroupChild = Group | Builder;
/**
 * A function run over a group's built child layers before they are concatenated,
 * for structural reordering such as drawing casings before fills.
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
 * `document` and `post` belong to the node they're set on. `sources` is the lookup
 * `.toGlStyle`/`.getSources` resolve layers against; it merges with every
 * descendant group's `sources` so a group composed from self-contained sub-groups
 * needs no re-declaration, the outer (shallower) definition winning on a conflict.
 * Glyphs and sprite are style concerns derived from the layer body, not configured
 * here — see {@link Builder#getGlyphsUrl}.
 */
export type GroupConfig = {
    theme?: Theme;
    /**
     * Source lookup keyed by source name;
     * only names a layer references are resolved.
     */
    sources?: Record<string, object>;
    document?: DocumentFields;
    post?: PostProcessor[];
};
import type { Theme } from "./style.js";
import { Builder } from "./style.js";
import type { ResolvedLayer } from "./style.js";
