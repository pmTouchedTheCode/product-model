import { addChildBlock, moveIntoContainer, newBlockForType } from "@/lib/editor-model";
import { describe, expect, it } from "vitest";

describe("grammar constrained operations", () => {
	it("rejects invalid root type", () => {
		const next = addChildBlock([], null, newBlockForType("Section"));
		expect(next.error).toMatch(/cannot be added at root/);
	});

	it("rejects invalid nesting", () => {
		const root = addChildBlock([], null, {
			...newBlockForType("Feature"),
			uiId: "feature",
			id: "feature",
		});
		expect(root.error).toBeUndefined();

		const withDefinition = addChildBlock(root.blocks, "feature", {
			...newBlockForType("Definition"),
			uiId: "definition",
			id: "definition",
		});
		expect(withDefinition.error).toBeUndefined();

		const withPolicy = addChildBlock(withDefinition.blocks, "feature", {
			...newBlockForType("Policy"),
			uiId: "policy",
			id: "policy",
		});
		expect(withPolicy.error).toBeUndefined();

		const moved = moveIntoContainer(withPolicy.blocks, "definition", "policy");
		expect(moved.error).toMatch(/not allowed inside Policy/);
	});
});
