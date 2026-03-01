import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

interface DiscoverWorkspaceFilesOptions {
	workspaceRoot: string;
	include: string[];
	exclude: string[];
}

const SKIP_DIRECTORY_NAMES = new Set([".git", "node_modules", "dist"]);

function toPosixPath(filePath: string): string {
	return filePath.split(sep).join("/");
}

function escapeRegex(value: string): string {
	return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function globToRegExp(pattern: string): RegExp {
	const normalized = toPosixPath(pattern).replace(/^\.\//, "");
	let source = "^";

	for (let i = 0; i < normalized.length; i++) {
		const char = normalized.charAt(i);
		const next = normalized.charAt(i + 1);
		const nextNext = normalized.charAt(i + 2);

		if (char === "*" && next === "*" && nextNext === "/") {
			source += "(?:.*/)?";
			i += 2;
			continue;
		}

		if (char === "*" && next === "*") {
			source += ".*";
			i++;
			continue;
		}

		if (char === "*") {
			source += "[^/]*";
			continue;
		}

		if (char === "?") {
			source += "[^/]";
			continue;
		}

		source += escapeRegex(char);
	}

	source += "$";
	return new RegExp(source);
}

function createMatcher(patterns: string[]): (value: string) => boolean {
	const compiledPatterns = patterns.map(globToRegExp);
	return (value: string) => compiledPatterns.some((pattern) => pattern.test(value));
}

export async function discoverWorkspaceFiles(
	options: DiscoverWorkspaceFilesOptions,
): Promise<string[]> {
	const filePaths: string[] = [];
	const matchesInclude = createMatcher(options.include);
	const matchesExclude = createMatcher(options.exclude);

	async function walkDirectory(currentDirectory: string): Promise<void> {
		const entries = await readdir(currentDirectory, { withFileTypes: true });
		entries.sort((a, b) => a.name.localeCompare(b.name));

		for (const entry of entries) {
			if (entry.isDirectory() && SKIP_DIRECTORY_NAMES.has(entry.name)) {
				continue;
			}

			const absolutePath = join(currentDirectory, entry.name);
			const relativePath = toPosixPath(relative(options.workspaceRoot, absolutePath));

			if (entry.isDirectory()) {
				await walkDirectory(absolutePath);
				continue;
			}

			if (!entry.isFile() || !relativePath.endsWith(".product.mdx")) {
				continue;
			}

			if (!matchesInclude(relativePath) || matchesExclude(relativePath)) {
				continue;
			}

			filePaths.push(relativePath);
		}
	}

	await walkDirectory(options.workspaceRoot);

	return filePaths.sort((a, b) => a.localeCompare(b));
}
