import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PMDocument } from "../src/types/ast.js";
import { validate } from "../src/validator/index.js";
import { parseWorkspace, validateWorkspace } from "../src/workspace/index.js";

const tempDirectories: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "pm-workspace-"));
	tempDirectories.push(root);

	for (const [relativePath, content] of Object.entries(files)) {
		const absolutePath = join(root, relativePath);
		await mkdir(dirname(absolutePath), { recursive: true });
		await writeFile(absolutePath, content, "utf-8");
	}

	return root;
}

function featureBlock(featureId: string, children = ""): string {
	return `<Feature id="${featureId}" name="${featureId}" status="draft">
${children}
</Feature>`;
}

afterEach(async () => {
	for (const dir of tempDirectories.splice(0)) {
		await rm(dir, { recursive: true, force: true });
	}
});

describe("workspace parser", () => {
	it("discovers nested files recursively and keeps module ordering stable", async () => {
		const workspaceRoot = await createWorkspace({
			"zeta/late.product.mdx": featureBlock("late-feature"),
			"alpha/first.product.mdx": featureBlock("first-feature"),
			"alpha/nested/second.product.mdx": featureBlock("second-feature"),
			"root.product.mdx": featureBlock("root-feature"),
			"dist/ignored.product.mdx": featureBlock("ignored-feature"),
		});

		const workspace = await parseWorkspace({
			workspaceRoot,
			title: "Workspace",
			version: "1.0.0",
		});

		expect(workspace.modules.map((module) => module.filePath)).toEqual([
			"alpha/first.product.mdx",
			"alpha/nested/second.product.mdx",
			"root.product.mdx",
			"zeta/late.product.mdx",
		]);
		expect(workspace.mergedDocument.blocks).toHaveLength(4);
	});
});

describe("workspace validation", () => {
	it("resolves cross-file links by bare block IDs", async () => {
		const workspaceRoot = await createWorkspace({
			"features/checkout.product.mdx": featureBlock(
				"checkout",
				`<Link id="checkout-to-payment" from="checkout" to="payment" relationship="depends-on" />`,
			),
			"features/payment.product.mdx": featureBlock("payment"),
		});

		const workspace = await parseWorkspace({
			workspaceRoot,
			title: "Checkout Workspace",
			version: "1.0.0",
		});
		const result = validateWorkspace(workspace);

		expect(result.valid).toBe(true);
		expect(result.diagnostics).toHaveLength(0);
	});

	it("reports unresolved link targets with file paths", async () => {
		const workspaceRoot = await createWorkspace({
			"features/checkout.product.mdx": featureBlock(
				"checkout",
				`<Link id="checkout-to-missing" from="checkout" to="missing-id" relationship="depends-on" />`,
			),
		});

		const workspace = await parseWorkspace({
			workspaceRoot,
			title: "Broken Workspace",
			version: "1.0.0",
		});
		const result = validateWorkspace(workspace);

		expect(result.valid).toBe(false);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]?.path).toBe("features/checkout.product.mdx");
		expect(result.diagnostics[0]?.message).toContain("missing-id");
	});

	it("reports duplicate IDs across different files", async () => {
		const workspaceRoot = await createWorkspace({
			"features/a.product.mdx": featureBlock("duplicate-id"),
			"features/b.product.mdx": featureBlock("duplicate-id"),
		});

		const workspace = await parseWorkspace({
			workspaceRoot,
			title: "Duplicate Workspace",
			version: "1.0.0",
		});
		const result = validateWorkspace(workspace);

		expect(result.valid).toBe(false);
		expect(
			result.diagnostics.some((diagnostic) => diagnostic.message.includes("Duplicate block ID")),
		).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.path)).toContain(
			"features/a.product.mdx",
		);
		expect(result.diagnostics.map((diagnostic) => diagnostic.path)).toContain(
			"features/b.product.mdx",
		);
	});
});

describe("single-file validation compatibility", () => {
	it("keeps single-file link integrity behavior unchanged", () => {
		const document: PMDocument = {
			version: "1.0.0",
			title: "Single File",
			blocks: [
				{
					type: "Feature",
					id: "checkout",
					name: "Checkout",
					status: "draft",
					children: [
						{
							type: "Link",
							id: "broken-link",
							from: "checkout",
							to: "missing",
							relationship: "depends-on",
						},
					],
				},
			],
		};

		const result = validate(document);
		expect(result.valid).toBe(false);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]?.message).toContain("missing");
	});
});
