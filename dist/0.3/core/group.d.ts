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
    constructor(name: string | undefined, children: GroupChild[], config?: GroupConfig);
    name: string;
    children: GroupChild[];
    config: GroupConfig;
    /**
     * A new group with `theme` merged over its own.
     *
     * @param {Theme} theme
     */
    theme(theme: Theme): Group;
    get resources(): Resources;
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
    remove(...matchers: Matcher[]): Group;
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
    pick(...matchers: Matcher[]): Group;
    /**
     * An indented tree of group and style names, returned (not logged) for
     * inspection.
     *
     * @returns {string}
     */
    describe(): string;
    /**
     * Flattens the tree to layers in z-order (an escape hatch below the
     * `render.<target>` path): pushes inherited config into each child, builds it,
     * stamps `iml.group`, and runs post-processors over the finished layers.
     *
     * @returns {ResolvedLayer[]}
     */
    layers(): ResolvedLayer[];
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
    get render(): {
        maplibre: (map: any) => void;
        glStyle: () => any;
    };
    #private;
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
export function group(name: string, children: GroupChild[], config?: GroupConfig): Group;
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
 * A group's config. `theme` and `resources` flow down to descendants that don't
 * set their own.
 */
export type GroupConfig = {
    theme?: Theme;
    /**
     * The externals its layers reference.
     */
    resources?: Resources;
    document?: DocumentFields;
    post?: PostProcessor[];
};
/**
 * A group or style in the tree, as passed to a {@link Matcher} function.
 */
export type MatchNode = {
    kind: "group";
    name: string | undefined;
    group: Group;
} | {
    kind: "style";
    name: string | undefined;
    style: Builder;
};
/**
 * Chooses nodes for {@link Group#remove} or {@link Group#pick}. A name matches
 * any group or style with that name, anywhere in the tree.
 */
export type Matcher = string | ((node: MatchNode) => boolean);
import type { Theme } from "./style.js";
import type { Resources } from "./resources.js";
import type { ResolvedLayer } from "./style.js";
import { Builder } from "./style.js";
