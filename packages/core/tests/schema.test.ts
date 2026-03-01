import { describe, expect, it } from "vitest";
import {
	BlockIdSchema,
	ConstraintBlockSchema,
	DefinitionBlockSchema,
	FeatureBlockSchema,
	FieldTypeSchema,
	LinkBlockSchema,
	MetricBlockSchema,
	PMDocumentSchema,
	PolicyBlockSchema,
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
		it("accepts a valid definition", () => {
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
		it("accepts a valid policy", () => {
			const policy = PolicyBlockSchema.parse({
				type: "Policy",
				id: "max-qty",
				name: "Max Quantity",
				rule: "Cannot exceed 99",
			});
			expect(policy.enforcement).toBe("must");
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
	});

	describe("LinkBlockSchema", () => {
		it("accepts a valid link", () => {
			const link = LinkBlockSchema.parse({
				type: "Link",
				from: "blockA",
				to: "blockB",
				relationship: "depends-on",
			});
			expect(link.relationship).toBe("depends-on");
		});
	});

	describe("MetricBlockSchema", () => {
		it("accepts a valid metric", () => {
			const m = MetricBlockSchema.parse({
				type: "Metric",
				id: "latency",
				name: "API Latency",
				unit: "ms",
				target: "200",
			});
			expect(m.unit).toBe("ms");
		});
	});

	describe("FeatureBlockSchema", () => {
		it("accepts a feature with children", () => {
			const feature = FeatureBlockSchema.parse({
				type: "Feature",
				id: "checkout",
				name: "Checkout",
				status: "draft",
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
					status: "draft",
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
