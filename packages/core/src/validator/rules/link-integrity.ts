import type { Block, PMDocument } from "../../types/ast.js";
import type { ValidationDiagnostic } from "../../types/validation.js";

/**
 * Check that all Link block targets (from/to) reference existing block IDs.
 */
export function checkLinkIntegrity(document: PMDocument): ValidationDiagnostic[] {
	const diagnostics: ValidationDiagnostic[] = [];
	const allIds = new Set<string>();
	const links: Array<{ id?: string; from: string; to: string }> = [];

	collectIdsAndLinks(document.blocks, allIds, links);

	for (const link of links) {
		if (!allIds.has(link.from)) {
			diagnostics.push({
				severity: "error",
				message: `Link "from" target "${link.from}" does not reference an existing block ID`,
				blockId: link.id,
			});
		}
		if (!allIds.has(link.to)) {
			diagnostics.push({
				severity: "error",
				message: `Link "to" target "${link.to}" does not reference an existing block ID`,
				blockId: link.id,
			});
		}
	}

	return diagnostics;
}

function collectIdsAndLinks(
	blocks: Block[],
	allIds: Set<string>,
	links: Array<{ id?: string; from: string; to: string }>,
): void {
	for (const block of blocks) {
		if ("id" in block && typeof block.id === "string") {
			allIds.add(block.id);
		}

		if (block.type === "Link") {
			links.push({
				id: block.id,
				from: block.from,
				to: block.to,
			});
		}

		if ("children" in block && Array.isArray(block.children)) {
			collectIdsAndLinks(block.children as Block[], allIds, links);
		}
	}
}
