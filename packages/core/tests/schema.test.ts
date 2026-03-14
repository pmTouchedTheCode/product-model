import { describe, expect, it } from "vitest";
import {
	ActorBlockSchema,
	BlockIdSchema,
	ConstraintBlockSchema,
	DefinitionBlockSchema,
	FeatureBlockSchema,
	FieldTypeSchema,
	LinkBlockSchema,
	LogicBlockSchema,
	OutcomeBlockSchema,
	PMDocumentSchema,
	PolicyBlockSchema,
	ScenarioBlockSchema,
	SemVerSchema,
} from "../src/schema/index.js";

describe("primitives", () => {
	describe("BlockIdSchema", () => {
		it("accepts valid IDs", () => {
			expect(BlockIdSchema.parse("login")).toBe("login");
			expect(BlockIdSchema.parse("user-auth")).toBe("user-auth");
			expect(BlockIdSchema.parse("Feature01")).toBe("Feature01");
			expect(BlockIdSchema.parse("a_b_c")).toBe("a_b_c");
		});

		it("rejects invalid IDs", () => {
			expect(() => BlockIdSchema.parse("")).toThrow();
			expect(() => BlockIdSchema.parse("123abc")).toThrow();
			expect(() => BlockIdSchema.parse("-start")).toThrow();
			expect(() => BlockIdSchema.parse("has space")).toThrow();
		});
	});

	describe("SemVerSchema", () => {
		it("accepts valid versions", () => {
			expect(SemVerSchema.parse("1.0.0")).toBe("1.0.0");
			expect(SemVerSchema.parse("0.1.0")).toBe("0.1.0");
			expect(SemVerSchema.parse("10.20.30")).toBe("10.20.30");
		});

		it("rejects invalid versions", () => {
			expect(() => SemVerSchema.parse("1.0")).toThrow();
			expect(() => SemVerSchema.parse("v1.0.0")).toThrow();
			expect(() => SemVerSchema.parse("1.0.0-beta")).toThrow();
		});
	});

	describe("FieldTypeSchema", () => {
		it("accepts all valid field types", () => {
			for (const t of ["string", "number", "boolean", "datetime", "enum"]) {
				expect(FieldTypeSchema.parse(t)).toBe(t);
			}
		});

		it("rejects unknown types", () => {
			expect(() => FieldTypeSchema.parse("array")).toThrow();
		});
	});
});

describe("block schemas", () => {
	describe("DefinitionBlockSchema", () => {
		it("accepts a valid definition with flat fields", () => {
			const def = DefinitionBlockSchema.parse({
				type: "Definition",
				id: "user",
				name: "User",
				version: "1.0.0",
				fields: [{ name: "email", type: "string", required: true }],
			});
			expect(def.type).toBe("Definition");
			expect(def.fields).toHaveLength(1);
		});

		it("accepts fields with min/max constraints", () => {
			const def = DefinitionBlockSchema.parse({
				type: "Definition",
				id: "item",
				name: "Item",
				version: "1.0.0",
				fields: [{ name: "quantity", type: "number", required: true, min: 1, max: 99 }],
			});
			expect(def.fields[0]?.min).toBe(1);
			expect(def.fields[0]?.max).toBe(99);
		});

		it("accepts fields with pattern constraint", () => {
			const def = DefinitionBlockSchema.parse({
				type: "Definition",
				id: "order",
				name: "Order",
				version: "1.0.0",
				fields: [{ name: "orderId", type: "string", required: true, pattern: "^ORD-\\d+$" }],
			});
			expect(def.fields[0]?.pattern).toBe("^ORD-\\d+$");
		});

		it("rejects a definition without fields", () => {
			expect(() =>
				DefinitionBlockSchema.parse({
					type: "Definition",
					id: "empty",
					name: "Empty",
					version: "1.0.0",
					fields: [],
				}),
			).toThrow();
		});
	});

	describe("PolicyBlockSchema", () => {
		it("accepts a valid policy with default enforcement", () => {
			const policy = PolicyBlockSchema.parse({
				type: "Policy",
				id: "max-qty",
				name: "Max Quantity",
				rule: "Cannot exceed 99",
				children: [
					{
						type: "Logic",
						id: "max-qty-logic",
						name: "Quantity Guard",
						content: "Reject updates when requested quantity exceeds 99.",
					},
				],
			});
			expect(policy.enforcement).toBe("must");
		});

		it("accepts a policy with trigger and actor list", () => {
			const policy = PolicyBlockSchema.parse({
				type: "Policy",
				id: "max-qty",
				name: "Max Quantity",
				rule: "Cannot exceed 99",
				trigger: "cart.item.add",
				actor: ["guest", "member"],
			});
			expect(policy.trigger).toBe("cart.item.add");
			expect(policy.actor).toEqual(["guest", "member"]);
		});
	});

	describe("ConstraintBlockSchema", () => {
		it("accepts a valid constraint", () => {
			const c = ConstraintBlockSchema.parse({
				type: "Constraint",
				id: "positive",
				name: "Positive Value",
				condition: "value > 0",
			});
			expect(c.condition).toBe("value > 0");
		});

		it("accepts a constraint with actor list", () => {
			const c = ConstraintBlockSchema.parse({
				type: "Constraint",
				id: "positive",
				name: "Positive Value",
				condition: "value > 0",
				actor: ["guest"],
			});
			expect(c.actor).toEqual(["guest"]);
		});
	});

	describe("LinkBlockSchema", () => {
		it("accepts all original relationship types", () => {
			for (const rel of ["depends-on", "extends", "conflicts-with", "implements"]) {
				const link = LinkBlockSchema.parse({
					type: "Link",
					from: "blockA",
					to: "blockB",
					relationship: rel,
				});
				expect(link.relationship).toBe(rel);
			}
		});

		it("accepts new relationship types", () => {
			for (const rel of ["triggers", "supersedes", "validates", "enables", "blocks"]) {
				const link = LinkBlockSchema.parse({
					type: "Link",
					from: "blockA",
					to: "blockB",
					relationship: rel,
				});
				expect(link.relationship).toBe(rel);
			}
		});

		it("rejects an unknown relationship type", () => {
			expect(() =>
				LinkBlockSchema.parse({
					type: "Link",
					from: "blockA",
					to: "blockB",
					relationship: "replaces",
				}),
			).toThrow();
		});
	});

	describe("LogicBlockSchema", () => {
		it("accepts a valid logic block", () => {
			const logic = LogicBlockSchema.parse({
				type: "Logic",
				id: "checkout-validation",
				name: "Checkout Validation Logic",
				content: "Validate cart totals before submission.",
			});
			expect(logic.type).toBe("Logic");
		});
	});

	describe("ActorBlockSchema", () => {
		it("accepts a valid actor", () => {
			const actor = ActorBlockSchema.parse({
				type: "Actor",
				id: "guest-user",
				name: "Guest User",
				description: "Unauthenticated visitor",
			});
			expect(actor.type).toBe("Actor");
			expect(actor.id).toBe("guest-user");
		});

		it("requires id and name", () => {
			expect(() => ActorBlockSchema.parse({ type: "Actor" })).toThrow();
		});
	});

	describe("OutcomeBlockSchema", () => {
		it("accepts a valid outcome", () => {
			const outcome = OutcomeBlockSchema.parse({
				type: "Outcome",
				id: "checkout-cvr",
				name: "Checkout Conversion Rate",
				metric: "conversion_rate",
				target: "75%",
				timeframe: "30d",
				baseline: "68%",
				owner: "checkout-pm",
			});
			expect(outcome.metric).toBe("conversion_rate");
			expect(outcome.target).toBe("75%");
		});

		it("requires metric, target, timeframe", () => {
			expect(() =>
				OutcomeBlockSchema.parse({
					type: "Outcome",
					id: "cvr",
					name: "CVR",
				}),
			).toThrow();
		});
	});

	describe("ScenarioBlockSchema", () => {
		it("accepts a valid scenario", () => {
			const scenario = ScenarioBlockSchema.parse({
				type: "Scenario",
				id: "sc-cart-limit",
				name: "Cart at capacity",
				given: "A cart with 99 items",
				when: "User adds a 100th item",
				then: "System returns CART_LIMIT_EXCEEDED",
				policy: "max-quantity",
				actor: "guest-user",
			});
			expect(scenario.given).toBe("A cart with 99 items");
			expect(scenario.policy).toBe("max-quantity");
			expect(scenario.actor).toBe("guest-user");
		});

		it("requires given, when, then", () => {
			expect(() =>
				ScenarioBlockSchema.parse({
					type: "Scenario",
					id: "sc-x",
					name: "X",
				}),
			).toThrow();
		});
	});

	describe("FeatureBlockSchema", () => {
		it("accepts a feature with Definition children", () => {
			const feature = FeatureBlockSchema.parse({
				type: "Feature",
				id: "checkout",
				name: "Checkout",
				children: [
					{
						type: "Definition",
						id: "cart",
						name: "Cart",
						version: "1.0.0",
						fields: [{ name: "items", type: "string", required: true }],
					},
				],
			});
			expect(feature.children).toHaveLength(1);
		});

		it("accepts a feature with Actor, Outcome and Scenario children", () => {
			const feature = FeatureBlockSchema.parse({
				type: "Feature",
				id: "checkout",
				name: "Checkout",
				children: [
					{ type: "Actor", id: "guest", name: "Guest User" },
					{
						type: "Outcome",
						id: "cvr",
						name: "Conversion Rate",
						metric: "conversion_rate",
						target: "75%",
						timeframe: "30d",
					},
					{
						type: "Scenario",
						id: "sc-1",
						name: "Scenario 1",
						given: "State A",
						when: "Action B",
						then: "Result C",
					},
				],
			});
			expect(feature.children).toHaveLength(3);
		});

		it("rejects unsupported top-level attributes on Feature", () => {
			expect(() =>
				FeatureBlockSchema.parse({
					type: "Feature",
					id: "checkout",
					name: "Checkout",
					status: "approved",
					priority: "p0",
				}),
			).toThrow();
		});
	});
});

describe("PMDocumentSchema", () => {
	it("accepts a valid document", () => {
		const doc = PMDocumentSchema.parse({
			version: "1.0.0",
			title: "Test",
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "Feature 1",
				},
			],
		});
		expect(doc.title).toBe("Test");
		expect(doc.blocks).toHaveLength(1);
	});

	it("rejects a document with no blocks", () => {
		expect(() =>
			PMDocumentSchema.parse({
				version: "1.0.0",
				title: "Empty",
				blocks: [],
			}),
		).toThrow();
	});
});
