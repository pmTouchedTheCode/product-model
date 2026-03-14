import type { z } from "zod";
import type {
	ActorBlockSchema,
	BlockSchema,
	ConstraintBlockSchema,
	DefinitionBlockSchema,
	FeatureBlockSchema,
	LinkBlockSchema,
	LogicBlockSchema,
	OutcomeBlockSchema,
	PMDocumentSchema,
	PolicyBlockSchema,
	ScenarioBlockSchema,
} from "../schema/blocks.js";
import type { FieldSpecSchema } from "../schema/fields.js";
import type {
	BlockIdSchema,
	BlockTypeSchema,
	FieldTypeSchema,
	SemVerSchema,
	StatusSchema,
} from "../schema/primitives.js";

// ── Primitive types ──────────────────────────────────────────

export type BlockId = z.infer<typeof BlockIdSchema>;
export type SemVer = z.infer<typeof SemVerSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type BlockType = z.infer<typeof BlockTypeSchema>;
export type Status = z.infer<typeof StatusSchema>;

// ── Field types ──────────────────────────────────────────────

export type FieldSpec = z.infer<typeof FieldSpecSchema>;

// ── Block types ──────────────────────────────────────────────

export type DefinitionBlock = z.infer<typeof DefinitionBlockSchema>;
export type PolicyBlock = z.infer<typeof PolicyBlockSchema>;
export type ConstraintBlock = z.infer<typeof ConstraintBlockSchema>;
export type LinkBlock = z.infer<typeof LinkBlockSchema>;
export type LogicBlock = z.infer<typeof LogicBlockSchema>;
export type ActorBlock = z.infer<typeof ActorBlockSchema>;
export type OutcomeBlock = z.infer<typeof OutcomeBlockSchema>;
export type ScenarioBlock = z.infer<typeof ScenarioBlockSchema>;
export type { SectionBlock } from "../schema/blocks.js";
export type FeatureBlock = z.infer<typeof FeatureBlockSchema>;

export type Block = z.infer<typeof BlockSchema>;

// ── Document type ────────────────────────────────────────────

export type PMDocument = z.infer<typeof PMDocumentSchema>;
