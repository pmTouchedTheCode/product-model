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
	/**
	 * Semantic event name that fires this policy (e.g. "cart.item.add", "payment.capture.success").
	 * Human-readable and searchable — not evaluated at runtime.
	 */
	trigger: z.string().optional(),
	/**
	 * Space-separated list of Actor IDs this policy applies to.
	 * Parsed into an array during MDX transformation (e.g. actor="guest member" → ["guest","member"]).
	 */
	actor: z.array(BlockIdSchema).optional(),
	children: z.array(LogicBlockSchema).optional(),
});

export const ConstraintBlockSchema = z.object({
	type: z.literal("Constraint"),
	id: BlockIdSchema,
	name: z.string().min(1),
	description: z.string().optional(),
	content: BlockContentSchema,
	condition: z.string().min(1, "Constraint must have a condition"),
	/**
	 * Space-separated list of Actor IDs this constraint applies to.
	 * Parsed into an array during MDX transformation.
	 */
	actor: z.array(BlockIdSchema).optional(),
});

export const LinkBlockSchema = z.object({
	type: z.literal("Link"),
	id: BlockIdSchema.optional(),
	from: BlockIdSchema,
	to: BlockIdSchema,
	/**
	 * Semantic relationship between the two blocks.
	 * - depends-on    : `from` requires `to` to function
	 * - extends       : `from` specialises or builds upon `to`
	 * - conflicts-with: `from` and `to` cannot be active simultaneously
	 * - implements    : `from` is a concrete realisation of `to`
	 * - triggers      : `from` causes `to` to activate or fire
	 * - supersedes    : `from` replaces `to` (e.g. v2 replacing v1)
	 * - validates     : `from` must pass before `to` can proceed
	 * - enables       : `from` unlocks or gates `to`
	 * - blocks        : `from` prevents `to` while it is active
	 */
	relationship: z.enum([
		"depends-on",
		"extends",
		"conflicts-with",
		"implements",
		"triggers",
		"supersedes",
		"validates",
		"enables",
		"blocks",
	]),
	description: z.string().optional(),
	content: BlockContentSchema,
});

/**
 * Actor block — a first-class user role or persona.
 * Reference an Actor's `id` in the `actor` attribute of Policy, Constraint, or Scenario
 * to explicitly scope who a requirement applies to.
 */
export const ActorBlockSchema = z.object({
	type: z.literal("Actor"),
	id: BlockIdSchema,
	name: z.string().min(1),
	description: z.string().optional(),
	content: BlockContentSchema,
});

/**
 * Outcome block — a measurable product success criterion.
 * Allowed only inside Feature blocks. Anchors a feature to a concrete,
 * quantitative definition of success.
 */
export const OutcomeBlockSchema = z.object({
	type: z.literal("Outcome"),
	id: BlockIdSchema,
	name: z.string().min(1),
	/** The metric being tracked (e.g. "conversion_rate", "p99_latency_ms") */
	metric: z.string().min(1),
	/** Target value to reach (e.g. "75%", "200ms") */
	target: z.string().min(1),
	/** Measurement window (e.g. "30d", "Q2-2026") */
	timeframe: z.string().min(1),
	/** Current baseline value before the feature ships (e.g. "68%") */
	baseline: z.string().optional(),
	/** Team or individual accountable for this outcome */
	owner: z.string().optional(),
	description: z.string().optional(),
	content: BlockContentSchema,
});

/**
 * Scenario block — a structured acceptance criterion (Given / When / Then).
 * Links a human-readable test scenario directly to a Policy and optional Actor.
 */
export const ScenarioBlockSchema = z.object({
	type: z.literal("Scenario"),
	id: BlockIdSchema,
	name: z.string().min(1),
	/** The precondition state (e.g. "A cart with 50 items") */
	given: z.string().min(1),
	/** The triggering action (e.g. "The user attempts to add a 51st item") */
	when: z.string().min(1),
	/** The expected outcome (e.g. "System returns CART_LIMIT_EXCEEDED") */
	then: z.string().min(1),
	/** Optional reference to the Policy block this scenario validates */
	policy: BlockIdSchema.optional(),
	/** Optional reference to an Actor block that performs the action */
	actor: BlockIdSchema.optional(),
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
	ActorBlockSchema,
	OutcomeBlockSchema,
	ScenarioBlockSchema,
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
