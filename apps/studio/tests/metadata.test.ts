import { parseHeaderMetadata } from "@/lib/editor-model";
import { describe, expect, it } from "vitest";

describe("parseHeaderMetadata", () => {
	it("extracts title, version, and description from comment headers", () => {
		const source =
			"{/* title: Product Core */}\n{/* version: 2.1.0 */}\n{/* description: Core docs */}";
		const parsed = parseHeaderMetadata(source);
		expect(parsed).toEqual({
			title: "Product Core",
			version: "2.1.0",
			description: "Core docs",
		});
	});
});
