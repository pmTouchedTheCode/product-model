import { describe, expect, it } from "vitest";
import { GRAMMAR_TABLE, ROOT_BLOCK_TYPES } from "../src/grammar.js";

describe("GRAMMAR_TABLE", () => {
	it("defines all 10 block types", () => {
		const types = Object.keys(GRAMMAR_TABLE);
		expect(types).toHaveLength(10);
		expect(types).toContain("Feature");
		expect(types).toContain("Section");
		expect(types).toContain("Definition");
		expect(types).toContain("Policy");
		expect(types).toContain("Constraint");
		expect(types).toContain("Link");
		expect(types).toContain("Logic");
		expect(types).toContain("Actor");
		expect(types).toContain("Outcome");
		expect(types).toContain("Scenario");
	});

	it("Feature can hold all non-Feature block types", () => {
		expect(GRAMMAR_TABLE.Feature).toContain("Section");
		expect(GRAMMAR_TABLE.Feature).toContain("Definition");
		expect(GRAMMAR_TABLE.Feature).toContain("Policy");
		expect(GRAMMAR_TABLE.Feature).toContain("Constraint");
		expect(GRAMMAR_TABLE.Feature).toContain("Link");
		expect(GRAMMAR_TABLE.Feature).toContain("Logic");
		expect(GRAMMAR_TABLE.Feature).toContain("Actor");
		expect(GRAMMAR_TABLE.Feature).toContain("Outcome");
		expect(GRAMMAR_TABLE.Feature).toContain("Scenario");
		expect(GRAMMAR_TABLE.Feature).not.toContain("Feature");
	});

	it("Section excludes Logic and Outcome children", () => {
		expect(GRAMMAR_TABLE.Section).not.toContain("Logic");
		expect(GRAMMAR_TABLE.Section).not.toContain("Outcome");
	});

	it("Section allows Actor and Scenario children", () => {
		expect(GRAMMAR_TABLE.Section).toContain("Actor");
		expect(GRAMMAR_TABLE.Section).toContain("Scenario");
	});

	it("Policy allows only Logic children", () => {
		expect(GRAMMAR_TABLE.Policy).toEqual(["Logic"]);
	});

	it("leaf blocks have no children", () => {
		expect(GRAMMAR_TABLE.Definition).toEqual([]);
		expect(GRAMMAR_TABLE.Constraint).toEqual([]);
		expect(GRAMMAR_TABLE.Link).toEqual([]);
		expect(GRAMMAR_TABLE.Logic).toEqual([]);
		expect(GRAMMAR_TABLE.Actor).toEqual([]);
		expect(GRAMMAR_TABLE.Outcome).toEqual([]);
		expect(GRAMMAR_TABLE.Scenario).toEqual([]);
	});
});

describe("ROOT_BLOCK_TYPES", () => {
	it("only allows Feature at root", () => {
		expect(ROOT_BLOCK_TYPES).toEqual(["Feature"]);
	});
});
