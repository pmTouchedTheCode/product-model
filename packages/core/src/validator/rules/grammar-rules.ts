import { GRAMMAR_TABLE, ROOT_BLOCK_TYPES } from "../../grammar.js";
import type { Block, PMDocument } from "../../types/ast.js";
import type { ValidationDiagnostic } from "../../types/validation.js";

/**
 * Check that top-level blocks are valid root block types.
 * Check that parent-child relationships conform to the grammar table.
 */
export function checkGrammarRules(document: PMDocument): ValidationDiagnostic[] {
	const diagnostics: ValidationDiagnostic[] = [];

	for (const block of document.blocks) {
		if (!ROOT_BLOCK_TYPES.includes(block.type as (typeof ROOT_BLOCK_TYPES)[number])) {
			diagnostics.push({
				severity: "error",
				message: `Block type "${block.type}" is not allowed at document root. Allowed: ${ROOT_BLOCK_TYPES.join(", ")}`,
				blockId: "id" in block ? (block.id as string) : undefined,
			});
		}

		checkChildren(block, diagnostics);
	}

	return diagnostics;
}

function checkChildren(parent: Block, diagnostics: ValidationDiagnostic[]): void {
	if (!("children" in parent) || !Array.isArray(parent.children)) return;

	const allowedChildren = GRAMMAR_TABLE[parent.type];

	for (const child of parent.children as Block[]) {
		if (!allowedChildren.includes(child.type)) {
			diagnostics.push({
				severity: "error",
				message: `Block type "${child.type}" is not allowed as a child of "${parent.type}". Allowed: ${allowedChildren.join(", ") || "none"}`,
				blockId: "id" in child ? (child.id as string) : undefined,
			});
		}

		checkChildren(child, diagnostics);
	}
}
