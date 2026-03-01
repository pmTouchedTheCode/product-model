import { describe, expect, it } from "vitest";
import { parse } from "../src/parser/index.js";

describe("parser", () => {
	it("parses block body text into content", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  Checkout flow summary text.
  <Definition id="cart-item" name="Cart Item" version="1.0.0"
    fields='[{"name":"productId","type":"string","required":true}]'
  >
    Cart item schema body text.
  </Definition>
</Feature>
`;

		const document = await parse(source, { version: "1.0.0", title: "Checkout" });
		const feature = document.blocks[0];
		expect(feature?.type).toBe("Feature");
		expect(feature && "content" in feature ? feature.content : undefined).toContain(
			"Checkout flow summary text.",
		);

		const definition = feature && "children" in feature ? feature.children?.[0] : undefined;
		expect(definition?.type).toBe("Definition");
		expect(definition && "content" in definition ? definition.content : undefined).toContain(
			"Cart item schema body text.",
		);
	});

	it("parses policy with nested logic child", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  <Policy id="max-qty" name="Max Quantity" rule="Maximum 99 units" enforcement="must">
    Quantity cap policy description.
    <Logic id="max-qty-logic" name="Quantity Guard">
      Reject if quantity is greater than 99.
    </Logic>
  </Policy>
</Feature>
`;

		const document = await parse(source, { version: "1.0.0", title: "Checkout" });
		const policy =
			document.blocks[0] && "children" in document.blocks[0]
				? document.blocks[0].children?.[0]
				: undefined;
		expect(policy?.type).toBe("Policy");
		expect(policy && "children" in policy ? policy.children?.[0]?.type : undefined).toBe("Logic");
	});

	it("rejects unsupported status/priority attributes on Feature", async () => {
		const source = `<Feature id="checkout" name="Checkout Flow" status="approved" priority="p0" />`;

		await expect(parse(source, { version: "1.0.0", title: "Checkout" })).rejects.toThrow();
	});
});
