import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse } from "../parser/index.js";
import { PMWorkspaceSchema, ParseWorkspaceOptionsSchema } from "../schema/workspace.js";
import type { Block, PMDocument } from "../types/ast.js";
import type { ValidationDiagnostic, ValidationResult } from "../types/validation.js";
import type { PMWorkspace, ParseWorkspaceOptions } from "../types/workspace.js";
import { checkGrammarRules } from "../validator/rules/grammar-rules.js";
import { checkIdUniqueness } from "../validator/rules/id-uniqueness.js";
import { checkVersions } from "../validator/rules/version-check.js";
import { checkWorkspaceIdUniqueness } from "../validator/rules/workspace-id-uniqueness.js";
import { checkWorkspaceLinkIntegrity } from "../validator/rules/workspace-link-integrity.js";
import { discoverWorkspaceFiles } from "./discovery.js";

function collectBlockIds(blocks: Block[], collected: Set<string> = new Set<string>()): Set<string> {
	for (const block of blocks) {
		if ("id" in block && typeof block.id === "string") {
			collected.add(block.id);
		}

		if ("children" in block && Array.isArray(block.children)) {
			collectBlockIds(block.children as Block[], collected);
		}
	}

	return collected;
}

/**
 * Parse all .product.mdx files in a workspace into a workspace model.
 */
export async function parseWorkspace(options: ParseWorkspaceOptions): Promise<PMWorkspace> {
	const parsedOptions = ParseWorkspaceOptionsSchema.parse(options);
	const workspaceRoot = resolve(parsedOptions.workspaceRoot);

	const workspaceFiles = await discoverWorkspaceFiles({
		workspaceRoot,
		include: parsedOptions.include,
		exclude: parsedOptions.exclude,
	});

	if (workspaceFiles.length === 0) {
		throw new Error(`No .product.mdx files found under workspace root "${workspaceRoot}"`);
	}

	const modules: PMWorkspace["modules"] = [];
	const idIndex: Record<string, string> = {};
	const mergedBlocks: PMDocument["blocks"] = [];

	for (const filePath of workspaceFiles) {
		const source = await readFile(join(workspaceRoot, filePath), "utf-8");
		const document = await parse(source, {
			version: parsedOptions.version,
			title: parsedOptions.title,
			description: parsedOptions.description,
		});

		const blockIds = [...collectBlockIds(document.blocks)];
		mergedBlocks.push(...document.blocks);

		for (const id of blockIds) {
			if (!(id in idIndex)) {
				idIndex[id] = filePath;
			}
		}

		modules.push({
			filePath,
			document,
			blockIds,
		});
	}

	return PMWorkspaceSchema.parse({
		workspaceRoot,
		version: parsedOptions.version,
		title: parsedOptions.title,
		description: parsedOptions.description,
		modules,
		mergedDocument: {
			version: parsedOptions.version,
			title: parsedOptions.title,
			description: parsedOptions.description,
			blocks: mergedBlocks,
		},
		idIndex,
	});
}

/**
 * Validate all workspace modules and cross-file references.
 */
export function validateWorkspace(workspace: PMWorkspace): ValidationResult {
	const diagnostics: ValidationDiagnostic[] = [];

	for (const module of workspace.modules) {
		const moduleDiagnostics = [
			...checkGrammarRules(module.document),
			...checkIdUniqueness(module.document),
			...checkVersions(module.document),
		].map((diagnostic) => ({
			...diagnostic,
			path: module.filePath,
		}));

		diagnostics.push(...moduleDiagnostics);
	}

	diagnostics.push(...checkWorkspaceIdUniqueness(workspace));
	diagnostics.push(...checkWorkspaceLinkIntegrity(workspace));

	return {
		valid: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
		diagnostics,
	};
}

export { discoverWorkspaceFiles } from "./discovery.js";
