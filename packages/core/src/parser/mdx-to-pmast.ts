import { PMDocumentSchema } from "../schema/blocks.js";
import type { Block, PMDocument } from "../types/ast.js";
import type { ExtractedBlock } from "./remark-product-model.js";

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

	// Parse JSON-encoded fields attribute for Definition blocks
	if (extracted.type === "Definition" && typeof block.fields === "string") {
		try {
			block.fields = JSON.parse(block.fields as string);
		} catch {
			// Leave as-is; Zod validation will catch the error
		}
	}

	// Parse JSON-encoded enumValues within fields
	if (extracted.type === "Definition" && Array.isArray(block.fields)) {
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
