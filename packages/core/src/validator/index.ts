import type { PMDocument } from "../types/ast.js";
import type { ValidationDiagnostic, ValidationResult } from "../types/validation.js";
import { checkGrammarRules } from "./rules/grammar-rules.js";
import { checkIdUniqueness } from "./rules/id-uniqueness.js";
import { checkLinkIntegrity } from "./rules/link-integrity.js";
import { checkVersions } from "./rules/version-check.js";

/**
 * All built-in validation rules.
 * Each rule receives a PMDocument and returns an array of diagnostics.
 */
const RULES: Array<(document: PMDocument) => ValidationDiagnostic[]> = [
	checkGrammarRules,
	checkIdUniqueness,
	checkVersions,
	checkLinkIntegrity,
];

/**
 * Validate a PMDocument against all built-in rules.
 *
 * Collects all errors in one pass (all-errors mode) rather than fail-fast.
 *
 * @param document - A parsed PMDocument to validate
 * @returns ValidationResult with all diagnostics
 */
export function validate(document: PMDocument): ValidationResult {
	const diagnostics: ValidationDiagnostic[] = [];

	for (const rule of RULES) {
		diagnostics.push(...rule(document));
	}

	const valid = diagnostics.every((d) => d.severity !== "error");

	return { valid, diagnostics };
}

export { checkGrammarRules } from "./rules/grammar-rules.js";
export { checkIdUniqueness } from "./rules/id-uniqueness.js";
export { checkLinkIntegrity } from "./rules/link-integrity.js";
export { checkVersions } from "./rules/version-check.js";
