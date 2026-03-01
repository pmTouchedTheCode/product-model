import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listProductFiles, resolveSafePath } from "@/lib/product-files";
import { afterEach, describe, expect, it } from "vitest";

const createdDirs: string[] = [];

async function createWorkspace(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "studio-workspace-"));
	createdDirs.push(root);
	await writeFile(join(root, "pnpm-workspace.yaml"), 'packages:\n  - "packages/*"\n');
	return root;
}

afterEach(() => {
	process.env.INIT_CWD = undefined;
});

describe("path guard", () => {
	it("rejects traversal and non-product paths", async () => {
		const root = await createWorkspace();
		process.chdir(root);

		await expect(resolveSafePath("../evil.product.mdx")).rejects.toThrow("traversal");
		await expect(resolveSafePath("notes/readme.mdx")).rejects.toThrow("Only .product.mdx");
	});

	it("lists product files sorted and relative", async () => {
		const root = await createWorkspace();
		await mkdir(join(root, "models/a"), { recursive: true });
		await mkdir(join(root, "models/b"), { recursive: true });
		await writeFile(join(root, "models/b/two.product.mdx"), "");
		await writeFile(join(root, "models/a/one.product.mdx"), "");
		process.chdir(root);

		const files = await listProductFiles();
		expect(files.map((file) => file.path)).toEqual([
			"models/a/one.product.mdx",
			"models/b/two.product.mdx",
		]);
	});
});
