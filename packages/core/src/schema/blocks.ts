import { z } from "zod";
import { ValidatedFieldSpecSchema } from "./fields.js";
import { BlockIdSchema, PrioritySchema, SemVerSchema, StatusSchema } from "./primitives.js";

// ── Leaf blocks ──────────────────────────────────────────────

export const DefinitionBlockSchema = z.object({
	type: z.literal("Definition"),
	id: BlockIdSchema,
	name: z.string().min(1),
	version: SemVerSchema,
	description: z.string().optional(),
	fields: z.array(ValidatedFieldSpecSchema).min(1, "Definition must have at least one field"),
});

export const PolicyBlockSchema = z.object({
	type: z.literal("Policy"),
	id: BlockIdSchema,
	name: z.string().min(1),
	description: z.string().optional(),
	rule: z.string().min(1, "Policy must have a rule"),
	enforcement: z.enum(["must", "should", "may"]).default("must"),
});

export const ConstraintBlockSchema = z.object({
	type: z.literal("Constraint"),
	id: BlockIdSchema,
	name: z.string().min(1),
	description: z.string().optional(),
	condition: z.string().min(1, "Constraint must have a condition"),
});

export const LinkBlockSchema = z.object({
	type: z.literal("Link"),
	id: BlockIdSchema.optional(),
	from: BlockIdSchema,
	to: BlockIdSchema,
	relationship: z.enum(["depends-on", "extends", "conflicts-with", "implements"]),
	description: z.string().optional(),
});

export const MetricBlockSchema = z.object({
	type: z.literal("Metric"),
	id: BlockIdSchema,
	name: z.string().min(1),
	description: z.string().optional(),
	unit: z.string().optional(),
	target: z.string().optional(),
});

// ── Child block union (non-recursive leaf types) ─────────────

const LeafBlockSchema = z.union([
	DefinitionBlockSchema,
	PolicyBlockSchema,
	ConstraintBlockSchema,
	LinkBlockSchema,
	MetricBlockSchema,
]);

type LeafBlock = z.infer<typeof LeafBlockSchema>;

// ── Recursive containers ─────────────────────────────────────

/**
 * SectionBlock is defined as an explicit interface because Zod's recursive
 * types with z.lazy() require a manual type annotation, and defaults in
 * nested schemas cause input/output type divergence. The double cast is
 * the standard workaround for recursive Zod schemas.
 */
export interface SectionBlock {
	type: "Section";
	id: string;
	name: string;
	status?: "draft" | "proposed" | "approved" | "deprecated";
	description?: string;
	children?: Array<LeafBlock | SectionBlock>;
}

const SectionBlockSchemaBase = z.object({
	type: z.literal("Section"),
	id: BlockIdSchema,
	name: z.string().min(1),
	status: StatusSchema.optional(),
	description: z.string().optional(),
});

export const SectionBlockSchema: z.ZodType<SectionBlock> = SectionBlockSchemaBase.extend({
	children: z.lazy(() => z.array(z.union([LeafBlockSchema, SectionBlockSchema]))).optional(),
}) as unknown as z.ZodType<SectionBlock>;

export const FeatureBlockSchema = z.object({
	type: z.literal("Feature"),
	id: BlockIdSchema,
	name: z.string().min(1),
	status: StatusSchema.default("draft"),
	priority: PrioritySchema.optional(),
	description: z.string().optional(),
	children: z.lazy(() => z.array(z.union([LeafBlockSchema, SectionBlockSchema]))).optional(),
});

// ── Union of all blocks ──────────────────────────────────────

export const BlockSchema = z.union([FeatureBlockSchema, SectionBlockSchema, LeafBlockSchema]);

// ── Document root ────────────────────────────────────────────

export const PMDocumentSchema = z.object({
	version: SemVerSchema,
	title: z.string().min(1),
	description: z.string().optional(),
	blocks: z.array(BlockSchema).min(1, "Document must have at least one block"),
});
