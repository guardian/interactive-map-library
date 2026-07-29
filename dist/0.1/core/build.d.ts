export function casingsFirst(...roads: ResolvedLayer[][]): ResolvedLayer[];
export function buildGlStyle(furniture: Furniture, layers: any[]): {
    layers: any[];
    sources: any;
    metadata: any;
    sprite: string;
    glyphs: string;
    name: string;
    version: number;
};
/**
 * A GL style document's top-level fields, minus `layers`.
 */
export type Furniture = {
    version?: number;
    name?: string;
    glyphs?: string;
    sprite?: string;
    metadata?: object;
    sources?: object;
};
import type { ResolvedLayer } from "./style.js";
