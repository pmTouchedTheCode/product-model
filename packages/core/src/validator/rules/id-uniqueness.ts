import type { Block, PMDocument } from "../../types/ast.js";
import type { ValidationDiagnostic } from "../../types/validation.js";

/**
 * Check that all block IDs are unique within the document.
 */
export function checkIdUniqueness(document: PMDocument): ValidationDiagnostic[] {
	const diagnostics: ValidationDiagnostic[] = [];
	const seen = new Map<string, number>();

	collectIds(document.blocks, seen);

	for (const [id, count] of seen) {
		if (count > 1) {
			diagnostics.push({
				severity: "error",
				message: `Duplicate block ID "${id}" found ${count} times. IDs must be unique within a document.`,
				blockId: id,
			});
		}
	}

	return diagnostics;
}

function collectIds(blocks: Block[], seen: Map<string, number>): void {
	for (const block of blocks) {
		if ("id" in block && typeof block.id === "string") {
			seen.set(block.id, (seen.get(block.id) ?? 0) + 1);
		}

		if ("children" in block && Array.isArray(block.children)) {
			collectIds(block.children as Block[], seen);
		}
	}
}
