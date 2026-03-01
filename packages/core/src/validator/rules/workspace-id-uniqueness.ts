import type { ValidationDiagnostic } from "../../types/validation.js";
import type { PMWorkspace } from "../../types/workspace.js";

/**
 * Check that all block IDs are unique across files in workspace mode.
 */
export function checkWorkspaceIdUniqueness(workspace: PMWorkspace): ValidationDiagnostic[] {
	const idToFiles = new Map<string, Set<string>>();
	const diagnostics: ValidationDiagnostic[] = [];

	for (const module of workspace.modules) {
		for (const id of module.blockIds) {
			if (!idToFiles.has(id)) {
				idToFiles.set(id, new Set<string>());
			}
			idToFiles.get(id)?.add(module.filePath);
		}
	}

	for (const [id, files] of idToFiles) {
		if (files.size <= 1) continue;

		const sortedFiles = [...files].sort((a, b) => a.localeCompare(b));
		const message = `Duplicate block ID "${id}" found across workspace files: ${sortedFiles.join(", ")}. IDs must be globally unique in workspace mode.`;

		for (const filePath of sortedFiles) {
			diagnostics.push({
				severity: "error",
				message,
				blockId: id,
				path: filePath,
			});
		}
	}

	return diagnostics;
}
