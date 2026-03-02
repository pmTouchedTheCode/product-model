import { access, mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import type { EditorMetadata } from "@/lib/editor-model";
import { parseHeaderMetadata, serializeProductMdx } from "@/lib/editor-model";

const IGNORED_DIRS = new Set([".git", "node_modules", "dist", ".next", "coverage", ".turbo"]);

export interface ProductFileEntry {
	path: string;
	name: string;
	dir: string;
}

function normalizePosix(value: string): string {
	return value.replace(/\\/g, "/");
}

async function findWorkspaceRoot(startingCwd: string): Promise<string> {
	let current = resolve(startingCwd);

	while (true) {
		const marker = join(current, "pnpm-workspace.yaml");
		try {
			await access(marker);
			return current;
		} catch {
			const parent = dirname(current);
			if (parent === current) {
				return resolve(startingCwd);
			}
			current = parent;
		}
	}
}

export async function getWorkspaceRoot(): Promise<string> {
	const envRoot = process.env.PRODUCT_MODEL_ROOT;
	if (envRoot) return resolve(envRoot);
	return findWorkspaceRoot(process.cwd());
}

function ensureProductFile(path: string): void {
	if (extname(path) !== ".mdx" || !path.endsWith(".product.mdx")) {
		throw new Error("Only .product.mdx files are allowed");
	}
}

function ensureRelative(path: string): string {
	if (!path || path.startsWith("/") || path.startsWith("~")) {
		throw new Error("Path must be a relative path");
	}

	const normalized = normalizePosix(path).replace(/^\.\//, "");
	if (normalized.includes("..")) {
		throw new Error("Path traversal is not allowed");
	}

	ensureProductFile(normalized);
	return normalized;
}

async function assertInsideWorkspace(workspaceRoot: string, absolutePath: string): Promise<void> {
	const rootReal = await realpath(workspaceRoot);
	let targetReal: string;

	try {
		targetReal = await realpath(absolutePath);
	} catch {
		targetReal = await realpath(dirname(absolutePath));
	}

	if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}/`)) {
		throw new Error("Path escapes workspace root");
	}
}

export async function resolveSafePath(
	relativePath: string,
): Promise<{ workspaceRoot: string; relativePath: string; absolutePath: string }> {
	const workspaceRoot = await getWorkspaceRoot();
	const normalized = ensureRelative(relativePath);
	const absolutePath = resolve(workspaceRoot, normalized);

	await assertInsideWorkspace(workspaceRoot, absolutePath);

	return {
		workspaceRoot,
		relativePath: normalized,
		absolutePath,
	};
}

async function walkFiles(root: string, current: string, acc: ProductFileEntry[]): Promise<void> {
	const dir = await import("node:fs/promises").then((m) =>
		m.readdir(current, { withFileTypes: true }),
	);
	dir.sort((a, b) => a.name.localeCompare(b.name));

	for (const entry of dir) {
		if (entry.isSymbolicLink()) {
			continue;
		}
		if (entry.isDirectory()) {
			if (IGNORED_DIRS.has(entry.name)) {
				continue;
			}
			await walkFiles(root, join(current, entry.name), acc);
			continue;
		}

		if (!entry.isFile() || !entry.name.endsWith(".product.mdx")) {
			continue;
		}

		const absolutePath = join(current, entry.name);
		const rel = normalizePosix(absolutePath.slice(root.length + 1));
		acc.push({
			path: rel,
			name: entry.name,
			dir: rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : ".",
		});
	}
}

export async function listProductFiles(): Promise<ProductFileEntry[]> {
	const root = await getWorkspaceRoot();
	const entries: ProductFileEntry[] = [];
	await walkFiles(root, root, entries);
	return entries.sort((a, b) => a.path.localeCompare(b.path));
}

function fallbackTitleFromPath(path: string): string {
	const fileName =
		path
			.split("/")
			.at(-1)
			?.replace(/\.product\.mdx$/, "") ?? "Untitled";
	return fileName
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export async function readProductFile(
	relativePath: string,
): Promise<{ path: string; content: string; metadata: EditorMetadata }> {
	const resolved = await resolveSafePath(relativePath);
	const content = await readFile(resolved.absolutePath, "utf8");
	const header = parseHeaderMetadata(content);

	return {
		path: resolved.relativePath,
		content,
		metadata: {
			title: header.title ?? fallbackTitleFromPath(resolved.relativePath),
			version: header.version ?? "1.0.0",
			description: header.description,
		},
	};
}

export async function writeProductFile(
	relativePath: string,
	content: string,
): Promise<{ path: string }> {
	const resolved = await resolveSafePath(relativePath);
	await mkdir(dirname(resolved.absolutePath), { recursive: true });
	await writeFile(resolved.absolutePath, content, "utf8");
	return { path: resolved.relativePath };
}

export async function createProductFile(
	relativePath: string,
	initialContent?: string,
	metadata?: Partial<EditorMetadata>,
): Promise<{ path: string }> {
	const resolved = await resolveSafePath(relativePath);

	try {
		await stat(resolved.absolutePath);
		throw new Error(`File already exists: ${resolved.relativePath}`);
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
			if (!(error instanceof Error && error.message.startsWith("File already exists"))) {
				throw error;
			}
			throw error;
		}
	}

	await mkdir(dirname(resolved.absolutePath), { recursive: true });
	const content =
		initialContent ??
		serializeProductMdx(
			{
				title: metadata?.title ?? fallbackTitleFromPath(resolved.relativePath),
				version: metadata?.version ?? "1.0.0",
				description: metadata?.description,
			},
			[
				{
					uiId: "scaffold-feature",
					type: "Feature",
					id: "new-feature",
					name: "New Feature",
					description: "Describe the feature intent.",
					children: [],
				},
			],
		);

	await writeFile(resolved.absolutePath, content, "utf8");
	return { path: resolved.relativePath };
}

export async function renameProductFile(
	fromPath: string,
	toPath: string,
): Promise<{ path: string }> {
	const fromResolved = await resolveSafePath(fromPath);
	const toResolved = await resolveSafePath(toPath);

	await mkdir(dirname(toResolved.absolutePath), { recursive: true });
	await rename(fromResolved.absolutePath, toResolved.absolutePath);

	return { path: toResolved.relativePath };
}

export async function deleteProductFile(relativePath: string): Promise<void> {
	const resolved = await resolveSafePath(relativePath);
	await rm(resolved.absolutePath, { force: true });
}
