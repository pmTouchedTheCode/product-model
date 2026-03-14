import { describe, expect, it } from "vitest";
import { parse } from "../src/parser/index.js";

describe("parser — Definition fields", () => {
	it("parses native <Field /> children into fields array", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  <Definition id="cart-item" name="Cart Item" version="1.0.0">
    Cart item schema.
    <Field name="productId" type="string" required />
    <Field name="quantity" type="number" required min={1} max={99} />
    <Field name="currency" type="enum" values="USD,EUR,GBP" required />
  </Definition>
</Feature>
`;
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const feature = doc.blocks[0];
		const definition = feature && "children" in feature ? feature.children?.[0] : undefined;
		expect(definition?.type).toBe("Definition");
		if (definition?.type !== "Definition") return;

		expect(definition.fields).toHaveLength(3);
		expect(definition.fields[0]).toMatchObject({ name: "productId", type: "string", required: true });
		expect(definition.fields[1]).toMatchObject({ name: "quantity", type: "number", min: 1, max: 99 });
		expect(definition.fields[2]).toMatchObject({
			name: "currency",
			type: "enum",
			enumValues: ["USD", "EUR", "GBP"],
		});
	});

	it("parses legacy JSON-encoded fields attribute (backward compatibility)", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  <Definition id="cart-item" name="Cart Item" version="1.0.0"
    fields='[{"name":"productId","type":"string","required":true}]'
  >
    Cart item schema body text.
  </Definition>
</Feature>
`;
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const feature = doc.blocks[0];
		const definition = feature && "children" in feature ? feature.children?.[0] : undefined;
		expect(definition?.type).toBe("Definition");
		if (definition?.type !== "Definition") return;
		expect(definition.fields).toHaveLength(1);
		expect(definition.fields[0]?.name).toBe("productId");
	});

	it("prefers native <Field /> children over JSON fields attribute when both present", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  <Definition id="cart-item" name="Cart Item" version="1.0.0"
    fields='[{"name":"legacy","type":"string","required":true}]'
  >
    <Field name="native" type="string" required />
  </Definition>
</Feature>
`;
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const feature = doc.blocks[0];
		const definition = feature && "children" in feature ? feature.children?.[0] : undefined;
		if (definition?.type !== "Definition") return;
		expect(definition.fields[0]?.name).toBe("native");
	});
});

describe("parser — block content", () => {
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
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const feature = doc.blocks[0];
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
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const policy =
			doc.blocks[0] && "children" in doc.blocks[0] ? doc.blocks[0].children?.[0] : undefined;
		expect(policy?.type).toBe("Policy");
		expect(policy && "children" in policy ? policy.children?.[0]?.type : undefined).toBe("Logic");
	});
});

describe("parser — Actor block", () => {
	it("parses an Actor block", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  <Actor id="guest" name="Guest User" description="Unauthenticated visitor" />
</Feature>
`;
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const actor =
			doc.blocks[0] && "children" in doc.blocks[0] ? doc.blocks[0].children?.[0] : undefined;
		expect(actor?.type).toBe("Actor");
		if (actor?.type !== "Actor") return;
		expect(actor.id).toBe("guest");
		expect(actor.description).toBe("Unauthenticated visitor");
	});
});

describe("parser — Outcome block", () => {
	it("parses an Outcome block", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  <Outcome id="cvr" name="Checkout Conversion Rate"
    metric="conversion_rate"
    target="75%"
    timeframe="30d"
    baseline="68%"
    owner="checkout-pm"
  />
</Feature>
`;
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const outcome =
			doc.blocks[0] && "children" in doc.blocks[0] ? doc.blocks[0].children?.[0] : undefined;
		expect(outcome?.type).toBe("Outcome");
		if (outcome?.type !== "Outcome") return;
		expect(outcome.metric).toBe("conversion_rate");
		expect(outcome.target).toBe("75%");
		expect(outcome.baseline).toBe("68%");
	});
});

describe("parser — Scenario block", () => {
	it("parses a Scenario block with policy and actor references", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  <Scenario id="sc-1" name="Cart limit scenario"
    given="A cart with 99 items"
    when="User adds a 100th item"
    then="System returns CART_LIMIT_EXCEEDED"
    policy="max-qty"
    actor="guest"
  />
</Feature>
`;
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const scenario =
			doc.blocks[0] && "children" in doc.blocks[0] ? doc.blocks[0].children?.[0] : undefined;
		expect(scenario?.type).toBe("Scenario");
		if (scenario?.type !== "Scenario") return;
		expect(scenario.given).toBe("A cart with 99 items");
		expect(scenario.policy).toBe("max-qty");
		expect(scenario.actor).toBe("guest");
	});
});

describe("parser — Policy actor and trigger", () => {
	it("parses Policy trigger and space-separated actor into array", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  <Policy id="max-qty" name="Max Quantity"
    trigger="cart.item.add"
    actor="guest member"
    rule="Cannot exceed 99"
    enforcement="must"
  />
</Feature>
`;
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const policy =
			doc.blocks[0] && "children" in doc.blocks[0] ? doc.blocks[0].children?.[0] : undefined;
		expect(policy?.type).toBe("Policy");
		if (policy?.type !== "Policy") return;
		expect(policy.trigger).toBe("cart.item.add");
		expect(policy.actor).toEqual(["guest", "member"]);
	});
});

describe("parser — Link relationships", () => {
	it("parses new relationship types", async () => {
		const source = `
<Feature id="checkout" name="Checkout Flow">
  <Section id="fraud" name="Fraud" />
  <Section id="payment" name="Payment" />
  <Link from="fraud" to="payment" relationship="validates" />
</Feature>
`;
		const doc = await parse(source, { version: "1.0.0", title: "Checkout" });
		const link =
			doc.blocks[0] && "children" in doc.blocks[0] ? doc.blocks[0].children?.[2] : undefined;
		expect(link?.type).toBe("Link");
		if (link?.type !== "Link") return;
		expect(link.relationship).toBe("validates");
	});
});

describe("parser — errors", () => {
	it("rejects unsupported attributes on Feature", async () => {
		const source = `<Feature id="checkout" name="Checkout Flow" status="approved" priority="p0" />`;
		await expect(parse(source, { version: "1.0.0", title: "Checkout" })).rejects.toThrow();
	});
});
