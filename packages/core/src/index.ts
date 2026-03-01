// ── Schema (Zod schemas — single source of truth) ────────────
export {
	BlockIdSchema,
	BlockSchema,
	BlockTypeSchema,
	ConstraintBlockSchema,
	DefinitionBlockSchema,
	FeatureBlockSchema,
	FieldSpecSchema,
	FieldTypeSchema,
	LinkBlockSchema,
	MetricBlockSchema,
	PMDocumentSchema,
	PMWorkspaceSchema,
	ParseWorkspaceOptionsSchema,
	PolicyBlockSchema,
	PrioritySchema,
	SectionBlockSchema,
	SemVerSchema,
	StatusSchema,
	ValidatedFieldSpecSchema,
	WorkspaceModuleSchema,
} from "./schema/index.js";

// ── Types (derived from schemas via z.infer) ─────────────────
export type {
	Block,
	BlockId,
	BlockType,
	BuildOutput,
	ConstraintBlock,
	DefinitionBlock,
	FeatureBlock,
	FieldSpec,
	FieldType,
	GrammarTable,
	LinkBlock,
	MetricBlock,
	PMDocument,
	PolicyBlock,
	Priority,
	SectionBlock,
	SemVer,
	Severity,
	Status,
	ValidationDiagnostic,
	ValidationResult,
	ValidationRule,
} from "./types/index.js";

// ── Grammar ──────────────────────────────────────────────────
export { GRAMMAR_TABLE, ROOT_BLOCK_TYPES } from "./grammar.js";

// ── Parser ───────────────────────────────────────────────────
export { parse } from "./parser/index.js";
export type { ParseOptions } from "./parser/index.js";

// ── Workspace ────────────────────────────────────────────────
export { discoverWorkspaceFiles, parseWorkspace, validateWorkspace } from "./workspace/index.js";

// ── Validator ────────────────────────────────────────────────
export { validate } from "./validator/index.js";
