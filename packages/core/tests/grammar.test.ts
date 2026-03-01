import { describe, expect, it } from "vitest";
import { GRAMMAR_TABLE, ROOT_BLOCK_TYPES } from "../src/grammar.js";

describe("GRAMMAR_TABLE", () => {
	it("defines all 7 block types", () => {
		const types = Object.keys(GRAMMAR_TABLE);
		expect(types).toHaveLength(7);
		expect(types).toContain("Feature");
		expect(types).toContain("Section");
		expect(types).toContain("Definition");
		expect(types).toContain("Policy");
		expect(types).toContain("Constraint");
		expect(types).toContain("Link");
		expect(types).toContain("Metric");
	});

	it("Feature can hold all non-Feature block types", () => {
		expect(GRAMMAR_TABLE.Feature).toContain("Section");
		expect(GRAMMAR_TABLE.Feature).toContain("Definition");
		expect(GRAMMAR_TABLE.Feature).toContain("Policy");
		expect(GRAMMAR_TABLE.Feature).toContain("Constraint");
		expect(GRAMMAR_TABLE.Feature).toContain("Link");
		expect(GRAMMAR_TABLE.Feature).toContain("Metric");
		expect(GRAMMAR_TABLE.Feature).not.toContain("Feature");
	});

	it("Section has the same children as Feature", () => {
		expect(GRAMMAR_TABLE.Section).toEqual(GRAMMAR_TABLE.Feature);
	});

	it("leaf blocks have no children", () => {
		expect(GRAMMAR_TABLE.Definition).toEqual([]);
		expect(GRAMMAR_TABLE.Policy).toEqual([]);
		expect(GRAMMAR_TABLE.Constraint).toEqual([]);
		expect(GRAMMAR_TABLE.Link).toEqual([]);
		expect(GRAMMAR_TABLE.Metric).toEqual([]);
	});
});

describe("ROOT_BLOCK_TYPES", () => {
	it("only allows Feature at root", () => {
		expect(ROOT_BLOCK_TYPES).toEqual(["Feature"]);
	});
});
