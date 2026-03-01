import type { GrammarTable } from "./types/grammar.js";

/**
 * Canonical grammar table defining allowed parent → children relationships.
 *
 * - Feature: top-level container. Can hold Section, Definition, Policy, Constraint, Link, Metric.
 * - Section: grouping container (recursive). Same children as Feature.
 * - Definition, Policy, Constraint, Link, Metric: leaf blocks with no children.
 */
export const GRAMMAR_TABLE: GrammarTable = {
	Feature: ["Section", "Definition", "Policy", "Constraint", "Link", "Metric"],
	Section: ["Section", "Definition", "Policy", "Constraint", "Link", "Metric"],
	Definition: [],
	Policy: [],
	Constraint: [],
	Link: [],
	Metric: [],
} as const;

/**
 * Block types that are allowed at the document root (top level).
 */
export const ROOT_BLOCK_TYPES = ["Feature"] as const;
