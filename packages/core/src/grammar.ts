import type { GrammarTable } from "./types/grammar.js";

/**
 * Canonical grammar table defining allowed parent → children relationships.
 *
 * - Feature: top-level container. Can hold all block types except nested Feature.
 *   Outcome is exclusive to Feature (not allowed in Section).
 * - Section: grouping container (recursive). Same children as Feature minus Logic and Outcome.
 * - Policy: can contain nested Logic blocks for detailed execution rules.
 * - Actor, Definition, Constraint, Link, Logic, Outcome, Scenario: leaf blocks with no children.
 */
export const GRAMMAR_TABLE: GrammarTable = {
	Feature: [
		"Section",
		"Definition",
		"Policy",
		"Constraint",
		"Link",
		"Logic",
		"Actor",
		"Outcome",
		"Scenario",
	],
	Section: ["Section", "Definition", "Policy", "Constraint", "Link", "Actor", "Scenario"],
	Definition: [],
	Policy: ["Logic"],
	Constraint: [],
	Link: [],
	Logic: [],
	Actor: [],
	Outcome: [],
	Scenario: [],
} as const;

/**
 * Block types that are allowed at the document root (top level).
 */
export const ROOT_BLOCK_TYPES = ["Feature"] as const;
