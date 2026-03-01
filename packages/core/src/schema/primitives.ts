import { z } from "zod";

/**
 * Unique identifier for a block within a document.
 * Must be a non-empty string matching [a-zA-Z][a-zA-Z0-9_-]*
 */
export const BlockIdSchema = z
	.string()
	.regex(
		/^[a-zA-Z][a-zA-Z0-9_-]*$/,
		"Block ID must start with a letter and contain only alphanumeric characters, hyphens, or underscores",
	);

/**
 * Semantic version string (e.g., "1.0.0", "2.1.3")
 */
export const SemVerSchema = z
	.string()
	.regex(/^\d+\.\d+\.\d+$/, "Must be a valid semantic version (e.g., 1.0.0)");

/**
 * Supported field value types in the product model.
 */
export const FieldTypeSchema = z.enum(["string", "number", "boolean", "datetime", "enum"]);

/**
 * Block types in the product model grammar.
 */
export const BlockTypeSchema = z.enum([
	"Feature",
	"Section",
	"Definition",
	"Policy",
	"Constraint",
	"Link",
	"Logic",
]);

/**
 * Status values for features and sections.
 */
export const StatusSchema = z.enum(["draft", "proposed", "approved", "deprecated"]);
