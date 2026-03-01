import type { z } from "zod";
import type {
	PMWorkspaceSchema,
	ParseWorkspaceOptionsSchema,
	WorkspaceModuleSchema,
} from "../schema/workspace.js";

export type ParseWorkspaceOptions = z.input<typeof ParseWorkspaceOptionsSchema>;
export type ResolvedParseWorkspaceOptions = z.infer<typeof ParseWorkspaceOptionsSchema>;
export type WorkspaceModule = z.infer<typeof WorkspaceModuleSchema>;
export type PMWorkspace = z.infer<typeof PMWorkspaceSchema>;
