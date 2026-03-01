import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse, parseWorkspace, validate, validateWorkspace } from "@product-model/core";
import { defineCommand } from "citty";

export const validateCommand = defineCommand({
	meta: {
		name: "validate",
		description: "Validate a .product.mdx file",
	},
	args: {
		file: {
			type: "positional",
			description: "Path to the .product.mdx file",
			required: false,
		},
		workspaceRoot: {
			type: "string",
			description: "Workspace root directory for multi-file validation",
		},
		title: {
			type: "string",
			description: "Document title",
			default: "Untitled",
		},
		version: {
			type: "string",
			description: "Document version",
			default: "0.1.0",
		},
	},
	async run({ args }) {
		try {
			if (args.workspaceRoot) {
				const workspaceRoot = resolve(args.workspaceRoot);
				const workspace = await parseWorkspace({
					workspaceRoot,
					version: args.version,
					title: args.title,
				});
				const result = validateWorkspace(workspace);

				if (result.valid) {
					console.log(
						`✓ ${workspaceRoot} workspace is valid (${workspace.modules.length} file(s))`,
					);
				} else {
					console.error(`✗ ${workspaceRoot} has ${result.diagnostics.length} issue(s):\n`);
					for (const d of result.diagnostics) {
						const prefix =
							d.severity === "error" ? "ERROR" : d.severity === "warning" ? "WARN" : "INFO";
						const pathInfo = d.path ? ` (${d.path})` : "";
						const blockInfo = d.blockId ? ` [${d.blockId}]` : "";
						console.error(`  ${prefix}${pathInfo}${blockInfo}: ${d.message}`);
					}
					process.exit(1);
				}
				return;
			}

			if (!args.file) {
				console.error('✗ Missing required argument: <file> (or use --workspace-root "<dir>")');
				process.exit(1);
			}

			const filePath = resolve(args.file);
			const source = await readFile(filePath, "utf-8");
			const document = await parse(source, {
				version: args.version,
				title: args.title,
			});
			const result = validate(document);

			if (!result.valid) {
				console.error(`✗ ${filePath} has ${result.diagnostics.length} issue(s):\n`);
				for (const d of result.diagnostics) {
					const prefix =
						d.severity === "error" ? "ERROR" : d.severity === "warning" ? "WARN" : "INFO";
					const blockInfo = d.blockId ? ` [${d.blockId}]` : "";
					console.error(`  ${prefix}${blockInfo}: ${d.message}`);
				}
				process.exit(1);
			} else {
				console.log(`✓ ${filePath} is valid`);
			}
		} catch (error) {
			const target = args.workspaceRoot ? resolve(args.workspaceRoot) : resolve(args.file ?? ".");
			console.error(`✗ Parse error in ${target}:`);
			console.error(`  ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		}
	},
});
