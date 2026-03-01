import { z } from "zod";
import { FieldTypeSchema } from "./primitives.js";

/**
 * Schema for a field specification within a Definition block.
 * Defines the name, type, requiredness, and optional constraints of a data field.
 */
export const FieldSpecSchema = z.object({
	name: z.string().min(1, "Field name is required"),
	type: FieldTypeSchema,
	required: z.boolean().default(true),
	description: z.string().optional(),
	enumValues: z.array(z.string()).optional(),
	default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

/**
 * Validate that enum fields have enumValues defined.
 */
export const ValidatedFieldSpecSchema = FieldSpecSchema.refine(
	(field) => field.type !== "enum" || (field.enumValues && field.enumValues.length > 0),
	{ message: "Enum fields must have at least one enumValues entry" },
);
