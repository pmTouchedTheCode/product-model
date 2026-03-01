import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";
import { BlockTypeSchema } from "../schema/primitives.js";

/**
 * Extracted block data from an MDX JSX element.
 */
export interface ExtractedBlock {
	type: string;
	attributes: Record<string, unknown>;
	children: ExtractedBlock[];
	position?: { line: number; column: number };
}

/**
 * Walk an MDAST node and check if it's an mdxJsxFlowElement.
 */
function isMdxJsxFlowElement(node: unknown): node is MdxJsxFlowElement {
	return (
		typeof node === "object" &&
		node !== null &&
		"type" in node &&
		(node as { type: string }).type === "mdxJsxFlowElement"
	);
}

/**
 * Extract attribute value from an MDX JSX attribute.
 */
function extractAttributeValue(attr: unknown): unknown {
	if (typeof attr !== "object" || attr === null) return undefined;
	const a = attr as { type?: string; name?: string; value?: unknown };
	if (a.type === "mdxJsxAttribute") {
		const val = a.value;
		if (typeof val === "string") return val;
		if (typeof val === "object" && val !== null && "value" in val) {
			return (val as { value: unknown }).value;
		}
		return true; // boolean attribute
	}
	return undefined;
}

/**
 * Extract block data from an MDX JSX element and its children.
 */
function extractBlock(node: MdxJsxFlowElement): ExtractedBlock | null {
	const tagName = node.name;
	if (!tagName) return null;

	const result = BlockTypeSchema.safeParse(tagName);
	if (!result.success) return null;

	const attributes: Record<string, unknown> = {};
	for (const attr of node.attributes) {
		if ("name" in attr && typeof attr.name === "string") {
			attributes[attr.name] = extractAttributeValue(attr);
		}
	}

	const children: ExtractedBlock[] = [];
	for (const child of node.children) {
		if (isMdxJsxFlowElement(child)) {
			const extracted = extractBlock(child);
			if (extracted) {
				children.push(extracted);
			}
		}
	}

	return {
		type: tagName,
		attributes,
		children,
		position: node.position
			? { line: node.position.start.line, column: node.position.start.column }
			: undefined,
	};
}

/**
 * Custom remark plugin that walks the MDAST, finds mdxJsxFlowElement nodes
 * matching product model block types, and attaches extracted block data.
 */
export const remarkProductModel: Plugin<[], Root> = () => {
	return (tree, file) => {
		const blocks: ExtractedBlock[] = [];

		for (const node of tree.children) {
			if (isMdxJsxFlowElement(node)) {
				const block = extractBlock(node);
				if (block) {
					blocks.push(block);
				}
			}
		}

		file.data.extractedBlocks = blocks;
	};
};
