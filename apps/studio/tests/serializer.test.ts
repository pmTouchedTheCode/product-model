import { type EditorBlock, serializeProductMdx } from "@/lib/editor-model";
import { describe, expect, it } from "vitest";

describe("serializeProductMdx", () => {
	it("emits canonical header and stable attributes", () => {
		const blocks: EditorBlock[] = [
			{
				uiId: "1",
				type: "Feature",
				id: "checkout",
				name: "Checkout",
				description: "Main checkout feature",
				children: [
					{
						uiId: "2",
						type: "Definition",
						id: "cart-item",
						name: "Cart Item",
						version: "1.0.0",
						fields: [{ name: "productId", type: "string", required: true }],
						description: "Line item",
					},
				],
			},
		];

		const output = serializeProductMdx(
			{
				title: "Checkout",
				version: "1.0.0",
			},
			blocks,
		);

		expect(output).toContain("{/* title: Checkout */}");
		expect(output).toContain('<Feature id="checkout" name="Checkout">');
		expect(output).toContain(
			"fields='[{&quot;name&quot;:&quot;productId&quot;,&quot;type&quot;:&quot;string&quot;,&quot;required&quot;:true}]'",
		);
		expect(output).toContain("</Definition>");
	});
});
