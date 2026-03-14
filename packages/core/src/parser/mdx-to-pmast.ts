import { PMDocumentSchema } from "../schema/blocks.js";
import type { Block, PMDocument } from "../types/ast.js";
import type { ExtractedBlock } from "./remark-product-model.js";

/**
 * Coerce a value that may be a stringified number (from MDX expression attributes)
 * into a JS number.  Returns undefined if the value is not numeric.
 */
function coerceNumber(value: unknown): number | undefined {
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const n = Number(value);
		return Number.isNaN(n) ? undefined : n;
	}
	return undefined;
}

/**
 * Transform native <Field /> attributes into a FieldSpec-compatible object.
 *
 * Handles:
 * - `values="USD,EUR"` → `enumValues: ["USD","EUR"]`  (comma-separated enum values)
 * - `required` (boolean attribute, present = true)
 * - `min={1}` / `max={99}` (JSX expression string → number coercion)
 */
function transformFieldAttrs(raw: Record<string, unknown>): Record<string, unknown> {
	const field: Record<string, unknown> = { ...raw };

	// Convert comma-separated `values` attribute → `enumValues` array
	if (typeof field.values === "string") {
		field.enumValues = field.values
			.split(",")
			.map((v) => v.trim())
			.filter(Boolean);
		field.values = undefined;
	}

	// Coerce numeric constraints
	const min = coerceNumber(field.min);
	if (min !== undefined) field.min = min;

	const max = coerceNumber(field.max);
	if (max !== undefined) field.max = max;

	// `required` is a boolean attribute — already `true` when present without value.
	// Handle the edge-case where it arrives as the string "false".
	if (field.required === "false") field.required = false;

	return field;
}

/**
 * Parse a space-separated actor string (e.g. "guest member") into an array of IDs.
 * Returns undefined if the value is absent or empty.
 */
function parseActorList(value: unknown): string[] | undefined {
	if (typeof value !== "string") return undefined;
	const ids = value.trim().split(/\s+/).filter(Boolean);
	return ids.length > 0 ? ids : undefined;
}

/**
 * Transform an extracted block into a typed Block.
 * Handles nested children for Feature and Section blocks.
 */
function transformBlock(extracted: ExtractedBlock): Record<string, unknown> {
	const block: Record<string, unknown> = {
		type: extracted.type,
		...extracted.attributes,
	};

	if (typeof extracted.content === "string" && extracted.content.length > 0) {
		block.content = extracted.content;
	}

	// ── Definition: resolve fields from native <Field /> children or legacy JSON ──
	if (extracted.type === "Definition") {
		const fieldChildren = block.fieldChildren as Record<string, unknown>[] | undefined;

		if (Array.isArray(fieldChildren) && fieldChildren.length > 0) {
			// Native <Field /> children take priority
			block.fields = fieldChildren.map(transformFieldAttrs);
			block.fieldChildren = undefined;
		} else {
			// Legacy JSON-encoded fields attribute (deprecated but still supported)
			if (typeof block.fields === "string") {
				try {
					block.fields = JSON.parse(block.fields as string);
				} catch {
					// Leave as-is; Zod validation will catch the error
				}
			}

			// Parse JSON-encoded enumValues within legacy fields
			if (Array.isArray(block.fields)) {
				block.fields = (block.fields as Record<string, unknown>[]).map((field) => {
					if (typeof field.enumValues === "string") {
						try {
							return { ...field, enumValues: JSON.parse(field.enumValues as string) };
						} catch {
							return field;
						}
					}
					return field;
				});
			}
		}

		// Always clean up leftover fieldChildren key
		block.fieldChildren = undefined;
	}

	// ── Policy / Constraint: parse space-separated actor list → string[] ──
	// Only transform when actor is a string; leave non-string values intact so
	// Zod can surface a meaningful validation error rather than silently discarding them.
	if (extracted.type === "Policy" || extracted.type === "Constraint") {
		if (typeof block.actor === "string") {
			const actorList = parseActorList(block.actor);
			if (actorList !== undefined) {
				block.actor = actorList;
			}
		}
	}

	if (extracted.children.length > 0) {
		block.children = extracted.children.map(transformBlock);
	}

	return block;
}

/**
 * Metadata extracted from MDAST frontmatter or document-level attributes.
 */
export interface DocumentMeta {
	version: string;
	title: string;
	description?: string;
}

/**
 * Transform extracted blocks into a PMDocument, validating through Zod.
 */
export function mdxToPmast(meta: DocumentMeta, extractedBlocks: ExtractedBlock[]): PMDocument {
	const raw = {
		version: meta.version,
		title: meta.title,
		description: meta.description,
		blocks: extractedBlocks.map(transformBlock),
	};

	return PMDocumentSchema.parse(raw);
}
