import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parse, validate } from "@product-model/core";
import { defineCommand } from "citty";

export const buildCommand = defineCommand({
	meta: {
		name: "build",
		description: "Parse, validate, and output a JSON AST from a .product.mdx file",
	},
	args: {
		file: {
			type: "positional",
			description: "Path to the .product.mdx file",
			required: true,
		},
		output: {
			type: "string",
			alias: "o",
			description: "Output file path (defaults to <filename>.json)",
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

		const document = await parse(source, {
			version: args.version,
			title: args.title,
		});

		const result = validate(document);

		if (!result.valid) {
			console.error(`✗ Validation failed with ${result.diagnostics.length} error(s):\n`);
			for (const d of result.diagnostics) {
				const prefix =
					d.severity === "error" ? "ERROR" : d.severity === "warning" ? "WARN" : "INFO";
				const blockInfo = d.blockId ? ` [${d.blockId}]` : "";
				console.error(`  ${prefix}${blockInfo}: ${d.message}`);
			}
			process.exit(1);
		}

		const outputPath = args.output
			? resolve(args.output)
			: resolve(basename(filePath).replace(/\.product\.mdx$/, ".json"));

		await writeFile(outputPath, JSON.stringify(document, null, 2), "utf-8");
		console.log(`✓ Built ${outputPath}`);
	},
});
