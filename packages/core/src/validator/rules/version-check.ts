import type { Block, PMDocument } from "../../types/ast.js";
import type { ValidationDiagnostic } from "../../types/validation.js";

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

/**
 * Check that all version strings in the document are valid semantic versions.
 * Applies to the document version and Definition block versions.
 */
export function checkVersions(document: PMDocument): ValidationDiagnostic[] {
	const diagnostics: ValidationDiagnostic[] = [];

	if (!SEMVER_REGEX.test(document.version)) {
		diagnostics.push({
			severity: "error",
			message: `Document version "${document.version}" is not a valid semantic version (expected x.y.z)`,
		});
	}

	checkBlockVersions(document.blocks, diagnostics);

	return diagnostics;
}

function checkBlockVersions(blocks: Block[], diagnostics: ValidationDiagnostic[]): void {
	for (const block of blocks) {
		if (block.type === "Definition" && !SEMVER_REGEX.test(block.version)) {
			diagnostics.push({
				severity: "error",
				message: `Definition "${block.id}" version "${block.version}" is not a valid semantic version (expected x.y.z)`,
				blockId: block.id,
			});
		}

		if ("children" in block && Array.isArray(block.children)) {
			checkBlockVersions(block.children as Block[], diagnostics);
		}
	}
}
