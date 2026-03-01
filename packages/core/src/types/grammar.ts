import type { BlockType } from "./ast.js";

/**
 * Grammar rule mapping a parent block type to its allowed child block types.
 */
export type GrammarTable = Record<BlockType, readonly BlockType[]>;
