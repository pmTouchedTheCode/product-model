import type { Block } from "../../types/ast.js";
import type { ValidationDiagnostic } from "../../types/validation.js";
import type { PMWorkspace } from "../../types/workspace.js";

interface LinkTarget {
	id?: string;
	from: string;
	to: string;
}

/**
 * Check that all link targets resolve to existing IDs across the workspace.
 */
export function checkWorkspaceLinkIntegrity(workspace: PMWorkspace): ValidationDiagnostic[] {
	const diagnostics: ValidationDiagnostic[] = [];

	for (const module of workspace.modules) {
		const links: LinkTarget[] = [];
		collectLinks(module.document.blocks, links);

		for (const link of links) {
			if (!(link.from in workspace.idIndex)) {
				diagnostics.push({
					severity: "error",
					message: `Link "from" target "${link.from}" does not reference an existing block ID in workspace`,
					blockId: link.id,
					path: module.filePath,
				});
			}

			if (!(link.to in workspace.idIndex)) {
				diagnostics.push({
					severity: "error",
					message: `Link "to" target "${link.to}" does not reference an existing block ID in workspace`,
					blockId: link.id,
					path: module.filePath,
				});
			}
		}
	}

	return diagnostics;
}

function collectLinks(blocks: Block[], links: LinkTarget[]): void {
	for (const block of blocks) {
		if (block.type === "Link") {
			links.push({
				id: block.id,
				from: block.from,
				to: block.to,
			});
		}

		if ("children" in block && Array.isArray(block.children)) {
			collectLinks(block.children as Block[], links);
		}
	}
}
