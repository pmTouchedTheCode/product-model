import type { GrammarTable } from "./types/grammar.js";

/**
 * Canonical grammar table defining allowed parent → children relationships.
 *
 * - Feature: top-level container. Can hold Section, Definition, Policy, Constraint, Link, Logic.
 * - Section: grouping container (recursive). Same children as Feature minus Logic.
 * - Policy: can contain nested Logic blocks for detailed execution rules.
 * - Definition, Constraint, Link, Logic: leaf blocks with no children.
 */
export const GRAMMAR_TABLE: GrammarTable = {
	Feature: ["Section", "Definition", "Policy", "Constraint", "Link", "Logic"],
	Section: ["Section", "Definition", "Policy", "Constraint", "Link"],
	Definition: [],
	Policy: ["Logic"],
	Constraint: [],
	Link: [],
	Logic: [],
} as const;

/**
 * Block types that are allowed at the document root (top level).
 */
export const ROOT_BLOCK_TYPES = ["Feature"] as const;
