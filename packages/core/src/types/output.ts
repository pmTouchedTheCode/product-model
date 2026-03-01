import type { PMDocument } from "./ast.js";
import type { ValidationResult } from "./validation.js";

/**
 * Output of the build process: parsed document + validation result.
 */
export interface BuildOutput {
	document: PMDocument;
	validation: ValidationResult;
}
