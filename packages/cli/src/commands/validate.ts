import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse, validate } from "@product-model/core";
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
			required: true,
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
		const filePath = resolve(args.file);
		const source = await readFile(filePath, "utf-8");

		try {
			const document = await parse(source, {
				version: args.version,
				title: args.title,
			});

			const result = validate(document);

			if (result.valid) {
				console.log(`✓ ${filePath} is valid`);
			} else {
				console.error(`✗ ${filePath} has ${result.diagnostics.length} issue(s):\n`);
				for (const d of result.diagnostics) {
					const prefix =
						d.severity === "error" ? "ERROR" : d.severity === "warning" ? "WARN" : "INFO";
					const blockInfo = d.blockId ? ` [${d.blockId}]` : "";
					console.error(`  ${prefix}${blockInfo}: ${d.message}`);
				}
				process.exit(1);
			}
		} catch (error) {
			console.error(`✗ Parse error in ${filePath}:`);
			console.error(`  ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		}
	},
});
