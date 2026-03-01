import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { PMDocument } from "../types/ast.js";
import { type DocumentMeta, mdxToPmast } from "./mdx-to-pmast.js";
import { type ExtractedBlock, remarkProductModel } from "./remark-product-model.js";

/**
 * Parse options for controlling document metadata.
 */
export interface ParseOptions {
	/** Document version (required) */
	version: string;
	/** Document title (required) */
	title: string;
	/** Document description (optional) */
	description?: string;
}

/**
 * Parse an MDX source string into a validated PMDocument.
 *
 * The source should contain JSX blocks (Feature, Section, Definition, etc.)
 * using the product model grammar.
 *
 * @param source - The MDX source string to parse
 * @param options - Document metadata (version, title)
 * @returns A validated PMDocument
 * @throws ZodError if the parsed document fails schema validation
 */
export async function parse(source: string, options: ParseOptions): Promise<PMDocument> {
	const processor = unified().use(remarkParse).use(remarkMdx).use(remarkProductModel);

	const file = await processor.process(source);

	const extractedBlocks = (file.data.extractedBlocks ?? []) as ExtractedBlock[];

	const meta: DocumentMeta = {
		version: options.version,
		title: options.title,
		description: options.description,
	};

	return mdxToPmast(meta, extractedBlocks);
}

export { remarkProductModel } from "./remark-product-model.js";
export { mdxToPmast } from "./mdx-to-pmast.js";
export type { DocumentMeta } from "./mdx-to-pmast.js";
export type { ExtractedBlock } from "./remark-product-model.js";
