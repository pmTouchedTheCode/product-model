import { z } from "zod";
import { FieldTypeSchema } from "./primitives.js";

/**
 * Schema for a field specification within a Definition block.
 * Defines the name, type, requiredness, and optional constraints of a data field.
 *
 * Fields can be authored either as native MDX child elements:
 *   <Field name="quantity" type="number" required min={1} max={99} />
 *
 * or as a legacy JSON-encoded `fields` attribute on the Definition block (deprecated).
 */
export const FieldSpecSchema = z.object({
	name: z.string().min(1, "Field name is required"),
	type: FieldTypeSchema,
	required: z.boolean().default(true),
	description: z.string().optional(),
	enumValues: z.array(z.string()).optional(),
	default: z.union([z.string(), z.number(), z.boolean()]).optional(),
	/** Minimum value — valid for `number` fields */
	min: z.number().optional(),
	/** Maximum value — valid for `number` fields */
	max: z.number().optional(),
	/** Regex pattern constraint — valid for `string` fields */
	pattern: z.string().optional(),
});

/**
 * Validate that enum fields have enumValues defined,
 * and that min/max/pattern are only used on appropriate field types.
 */
export const ValidatedFieldSpecSchema = FieldSpecSchema.refine(
	(field) => field.type !== "enum" || (field.enumValues && field.enumValues.length > 0),
	{ message: "Enum fields must have at least one enumValues entry" },
)
	.refine(
		(field) => (field.min === undefined && field.max === undefined) || field.type === "number",
		{ message: "min/max constraints are only valid for number fields" },
	)
	.refine((field) => field.pattern === undefined || field.type === "string", {
		message: "pattern constraint is only valid for string fields",
	});
