import { describe, expect, it } from "vitest";
import type { PMDocument } from "../src/types/ast.js";
import { validate } from "../src/validator/index.js";
import { checkGrammarRules } from "../src/validator/rules/grammar-rules.js";
import { checkIdUniqueness } from "../src/validator/rules/id-uniqueness.js";
import { checkLinkIntegrity } from "../src/validator/rules/link-integrity.js";
import { checkVersions } from "../src/validator/rules/version-check.js";

function makeDoc(overrides: Partial<PMDocument> = {}): PMDocument {
	return {
		version: "1.0.0",
		title: "Test",
		blocks: [
			{
				type: "Feature",
				id: "f1",
				name: "Feature 1",
			},
		],
		...overrides,
	};
}

describe("validate", () => {
	it("returns valid for a correct document", () => {
		const result = validate(makeDoc());
		expect(result.valid).toBe(true);
		expect(result.diagnostics).toHaveLength(0);
	});

	it("collects all errors in one pass", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "Feature",
					children: [
						{
							type: "Definition",
							id: "dup",
							name: "A",
							version: "1.0.0",
							fields: [{ name: "x", type: "string", required: true }],
						},
						{
							type: "Definition",
							id: "dup",
							name: "B",
							version: "1.0.0",
							fields: [{ name: "y", type: "string", required: true }],
						},
					],
				},
			],
		});
		const result = validate(doc);
		expect(result.valid).toBe(false);
		expect(result.diagnostics.length).toBeGreaterThan(0);
	});
});

describe("grammar-rules", () => {
	it("rejects non-Feature at root", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Definition" as "Feature",
					id: "orphan",
					name: "Orphan",
					version: "1.0.0",
					fields: [{ name: "x", type: "string", required: true }],
				} as PMDocument["blocks"][number],
			],
		});
		const diagnostics = checkGrammarRules(doc);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.message).toContain("not allowed at document root");
	});

	it("allows Actor, Outcome, Scenario as Feature children", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "Feature 1",
					children: [
						{ type: "Actor", id: "guest", name: "Guest" },
						{
							type: "Outcome",
							id: "cvr",
							name: "CVR",
							metric: "conversion_rate",
							target: "75%",
							timeframe: "30d",
						},
						{
							type: "Scenario",
							id: "sc-1",
							name: "Scenario",
							given: "G",
							when: "W",
							then: "T",
						},
					],
				},
			],
		});
		const diagnostics = checkGrammarRules(doc);
		expect(diagnostics).toHaveLength(0);
	});

	it("allows Actor and Scenario as Section children", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "Feature 1",
					children: [
						{
							type: "Section",
							id: "sec-1",
							name: "Section 1",
							children: [
								{ type: "Actor", id: "guest", name: "Guest" },
								{
									type: "Scenario",
									id: "sc-1",
									name: "Scenario",
									given: "G",
									when: "W",
									then: "T",
								},
							],
						},
					],
				},
			],
		});
		const diagnostics = checkGrammarRules(doc);
		expect(diagnostics).toHaveLength(0);
	});

	it("rejects Outcome as a Section child", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "Feature 1",
					children: [
						{
							type: "Section",
							id: "sec-1",
							name: "Section 1",
							children: [
								{
									type: "Outcome" as "Actor",
									id: "cvr",
									name: "CVR",
								} as PMDocument["blocks"][number],
							],
						},
					],
				},
			],
		});
		const diagnostics = checkGrammarRules(doc);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.message).toContain('"Outcome" is not allowed as a child of "Section"');
	});
});

describe("id-uniqueness", () => {
	it("detects duplicate IDs", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "F",
					children: [
						{
							type: "Definition",
							id: "same",
							name: "A",
							version: "1.0.0",
							fields: [{ name: "x", type: "string", required: true }],
						},
						{
							type: "Definition",
							id: "same",
							name: "B",
							version: "1.0.0",
							fields: [{ name: "y", type: "string", required: true }],
						},
					],
				},
			],
		});
		const diagnostics = checkIdUniqueness(doc);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.message).toContain("Duplicate block ID");
	});

	it("passes with unique IDs", () => {
		const diagnostics = checkIdUniqueness(makeDoc());
		expect(diagnostics).toHaveLength(0);
	});
});

describe("version-check", () => {
	it("passes with valid versions", () => {
		const diagnostics = checkVersions(makeDoc());
		expect(diagnostics).toHaveLength(0);
	});
});

describe("link-integrity", () => {
	it("detects broken link targets", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "F",
					children: [
						{
							type: "Link",
							from: "nonexistent",
							to: "f1",
							relationship: "depends-on",
						},
					],
				},
			],
		});
		const diagnostics = checkLinkIntegrity(doc);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.message).toContain("nonexistent");
	});

	it("passes with valid link targets", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "F",
					children: [
						{
							type: "Definition",
							id: "d1",
							name: "D",
							version: "1.0.0",
							fields: [{ name: "x", type: "string", required: true }],
						},
						{
							type: "Link",
							from: "f1",
							to: "d1",
							relationship: "depends-on",
						},
					],
				},
			],
		});
		const diagnostics = checkLinkIntegrity(doc);
		expect(diagnostics).toHaveLength(0);
	});

	it("validates new relationship types in links", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "F",
					children: [
						{ type: "Actor", id: "a1", name: "Actor 1" },
						{
							type: "Link",
							from: "f1",
							to: "a1",
							relationship: "enables",
						},
					],
				},
			],
		});
		const diagnostics = checkLinkIntegrity(doc);
		expect(diagnostics).toHaveLength(0);
	});

	it("detects broken Policy actor references", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "F",
					children: [
						{
							type: "Policy",
							id: "p1",
							name: "Policy",
							rule: "Some rule",
							actor: ["nonexistent-actor"],
						},
					],
				},
			],
		});
		const diagnostics = checkLinkIntegrity(doc);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.message).toContain("nonexistent-actor");
	});

	it("passes when Policy actor references a valid Actor block", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "F",
					children: [
						{ type: "Actor", id: "guest", name: "Guest" },
						{
							type: "Policy",
							id: "p1",
							name: "Policy",
							rule: "Some rule",
							actor: ["guest"],
						},
					],
				},
			],
		});
		const diagnostics = checkLinkIntegrity(doc);
		expect(diagnostics).toHaveLength(0);
	});

	it("detects broken Scenario policy reference", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "F",
					children: [
						{
							type: "Scenario",
							id: "sc-1",
							name: "Scenario",
							given: "G",
							when: "W",
							then: "T",
							policy: "nonexistent-policy",
						},
					],
				},
			],
		});
		const diagnostics = checkLinkIntegrity(doc);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.message).toContain("nonexistent-policy");
	});

	it("passes when Scenario references valid policy and actor", () => {
		const doc = makeDoc({
			blocks: [
				{
					type: "Feature",
					id: "f1",
					name: "F",
					children: [
						{ type: "Actor", id: "guest", name: "Guest" },
						{
							type: "Policy",
							id: "p1",
							name: "Policy",
							rule: "Some rule",
						},
						{
							type: "Scenario",
							id: "sc-1",
							name: "Scenario",
							given: "G",
							when: "W",
							then: "T",
							policy: "p1",
							actor: "guest",
						},
					],
				},
			],
		});
		const diagnostics = checkLinkIntegrity(doc);
		expect(diagnostics).toHaveLength(0);
	});
});
