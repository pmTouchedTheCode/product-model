/**
 * Severity levels for validation diagnostics.
 */
export type Severity = "error" | "warning" | "info";

/**
 * A single validation diagnostic.
 */
export interface ValidationDiagnostic {
	severity: Severity;
	message: string;
	blockId?: string;
	path?: string;
}

/**
 * Result of validating a product model document.
 */
export interface ValidationResult {
	valid: boolean;
	diagnostics: ValidationDiagnostic[];
}

/**
 * A validation rule function.
 */
export type ValidationRule = (document: unknown) => ValidationDiagnostic[];
