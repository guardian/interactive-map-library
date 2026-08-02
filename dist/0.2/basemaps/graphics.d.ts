export namespace sources {
    namespace openmaptiles {
        let type: string;
        let tiles: string[];
        let minzoom: number;
        let maxzoom: number;
    }
    namespace terrain {
        let type_1: string;
        export { type_1 as type };
        let tiles_1: string[];
        export { tiles_1 as tiles };
        let minzoom_1: number;
        export { minzoom_1 as minzoom };
        let maxzoom_1: number;
        export { maxzoom_1 as maxzoom };
    }
}
export const Landcover: import("../core/group.js").Group;
export const Reliefs: import("../core/group.js").Group;
export const Water: import("../core/group.js").Group;
export const Roads: import("../core/group.js").Group;
export const Buildings: import("../core/group.js").Group;
export const Bridges: import("../core/group.js").Group;
export const Boundaries: import("../core/group.js").Group;
export const Labels: import("../core/group.js").Group;
export const Graphics: import("../core/group.js").Group;
export { GLYPHS_URL as glyphs, SPRITE_URL as sprite } from "../core/resources.js";
