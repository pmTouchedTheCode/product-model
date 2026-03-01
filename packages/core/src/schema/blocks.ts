import { z } from "zod";
import { ValidatedFieldSpecSchema } from "./fields.js";
import { BlockIdSchema, SemVerSchema, StatusSchema } from "./primitives.js";

const BlockContentSchema = z.string().min(1).optional();

// ── Leaf blocks ──────────────────────────────────────────────

export const DefinitionBlockSchema = z.object({
	type: z.literal("Definition"),
	id: BlockIdSchema,
	name: z.string().min(1),
	version: SemVerSchema,
	description: z.string().optional(),
	content: BlockContentSchema,
	fields: z.array(ValidatedFieldSpecSchema).min(1, "Definition must have at least one field"),
});

export const LogicBlockSchema = z.object({
	type: z.literal("Logic"),
	id: BlockIdSchema,
	name: z.string().min(1),
	description: z.string().optional(),
	content: BlockContentSchema,
});

export const PolicyBlockSchema = z.object({
	type: z.literal("Policy"),
	id: BlockIdSchema,
	name: z.string().min(1),
	description: z.string().optional(),
	content: BlockContentSchema,
	rule: z.string().min(1, "Policy must have a rule"),
	enforcement: z.enum(["must", "should", "may"]).default("must"),
	children: z.array(LogicBlockSchema).optional(),
});

export const ConstraintBlockSchema = z.object({
	type: z.literal("Constraint"),
	id: BlockIdSchema,
	name: z.string().min(1),
	description: z.string().optional(),
	content: BlockContentSchema,
	condition: z.string().min(1, "Constraint must have a condition"),
});

export const LinkBlockSchema = z.object({
	type: z.literal("Link"),
	id: BlockIdSchema.optional(),
	from: BlockIdSchema,
	to: BlockIdSchema,
	relationship: z.enum(["depends-on", "extends", "conflicts-with", "implements"]),
	description: z.string().optional(),
	content: BlockContentSchema,
});

// ── Child block union (non-recursive leaf types) ─────────────

const NonContainerBlockSchema = z.union([
	DefinitionBlockSchema,
	PolicyBlockSchema,
	ConstraintBlockSchema,
	LinkBlockSchema,
	LogicBlockSchema,
]);

type NonContainerBlock = z.infer<typeof NonContainerBlockSchema>;

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
	content?: string;
	children?: Array<NonContainerBlock | SectionBlock>;
}

const SectionBlockSchemaBase = z.object({
	type: z.literal("Section"),
	id: BlockIdSchema,
	name: z.string().min(1),
	status: StatusSchema.optional(),
	description: z.string().optional(),
	content: BlockContentSchema,
});

export const SectionBlockSchema: z.ZodType<SectionBlock> = SectionBlockSchemaBase.extend({
	children: z
		.lazy(() => z.array(z.union([NonContainerBlockSchema, SectionBlockSchema])))
		.optional(),
}) as unknown as z.ZodType<SectionBlock>;

export const FeatureBlockSchema = z
	.object({
		type: z.literal("Feature"),
		id: BlockIdSchema,
		name: z.string().min(1),
		description: z.string().optional(),
		content: BlockContentSchema,
		children: z
			.lazy(() => z.array(z.union([NonContainerBlockSchema, SectionBlockSchema])))
			.optional(),
	})
	.strict();

// ── Union of all blocks ──────────────────────────────────────

export const BlockSchema = z.union([
	FeatureBlockSchema,
	SectionBlockSchema,
	NonContainerBlockSchema,
]);

// ── Document root ────────────────────────────────────────────

export const PMDocumentSchema = z.object({
	version: SemVerSchema,
	title: z.string().min(1),
	description: z.string().optional(),
	blocks: z.array(BlockSchema).min(1, "Document must have at least one block"),
});
