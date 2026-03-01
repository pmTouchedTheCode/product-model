import { z } from "zod";
import { PMDocumentSchema } from "./blocks.js";
import { BlockIdSchema, SemVerSchema } from "./primitives.js";

export const ParseWorkspaceOptionsSchema = z.object({
	workspaceRoot: z.string().min(1),
	title: z.string().min(1),
	version: SemVerSchema,
	description: z.string().optional(),
	include: z.array(z.string().min(1)).default(["**/*.product.mdx"]),
	exclude: z
		.array(z.string().min(1))
		.default([".git/**", "node_modules/**", "dist/**", "**/dist/**"]),
});

export const WorkspaceModuleSchema = z.object({
	filePath: z.string().min(1),
	document: PMDocumentSchema,
	blockIds: z.array(BlockIdSchema),
});

export const PMWorkspaceSchema = z.object({
	workspaceRoot: z.string().min(1),
	version: SemVerSchema,
	title: z.string().min(1),
	description: z.string().optional(),
	modules: z.array(WorkspaceModuleSchema).min(1),
	mergedDocument: PMDocumentSchema,
	idIndex: z.record(BlockIdSchema, z.string().min(1)),
});
