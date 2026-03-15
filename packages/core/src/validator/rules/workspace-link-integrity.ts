import type { Block } from "../../types/ast.js";
import type { ValidationDiagnostic } from "../../types/validation.js";
import type { PMWorkspace } from "../../types/workspace.js";

interface LinkTarget {
	id?: string;
	from: string;
	to: string;
}

interface ActorReference {
	blockId?: string;
	actorIds: string[];
	context: string;
}

interface ScenarioReference {
	blockId?: string;
	policyId?: string;
	actorId?: string;
}

/**
 * Check that all reference targets resolve to existing IDs across the workspace:
 * - Link `from` / `to`
 * - Policy / Constraint `actor` lists
 * - Scenario `policy` and `actor` references
 */
export function checkWorkspaceLinkIntegrity(workspace: PMWorkspace): ValidationDiagnostic[] {
	const diagnostics: ValidationDiagnostic[] = [];

	// Build typed ID sets by traversing all modules once up-front
	const workspaceActorIds = new Set<string>();
	const workspacePolicyIds = new Set<string>();
	for (const mod of workspace.modules) {
		collectTypedIds(mod.document.blocks, workspaceActorIds, workspacePolicyIds);
	}

	for (const module of workspace.modules) {
		const links: LinkTarget[] = [];
		const actorRefs: ActorReference[] = [];
		const scenarioRefs: ScenarioReference[] = [];

		collectRefs(module.document.blocks, links, actorRefs, scenarioRefs);

		// ── Link from/to ──────────────────────────────────────────
		for (const link of links) {
			if (!(link.from in workspace.idIndex)) {
				diagnostics.push({
					severity: "error",
					message: `Link "from" target "${link.from}" does not reference an existing block ID in workspace`,
					blockId: link.id,
					path: module.filePath,
				});
			}
			if (!(link.to in workspace.idIndex)) {
				diagnostics.push({
					severity: "error",
					message: `Link "to" target "${link.to}" does not reference an existing block ID in workspace`,
					blockId: link.id,
					path: module.filePath,
				});
			}
		}

		// ── Actor references ──────────────────────────────────────
		for (const ref of actorRefs) {
			for (const actorId of ref.actorIds) {
				if (!workspaceActorIds.has(actorId)) {
					diagnostics.push({
						severity: "error",
						message: `${ref.context} actor "${actorId}" does not reference an existing Actor block ID in workspace`,
						blockId: ref.blockId,
						path: module.filePath,
					});
				}
			}
		}

		// ── Scenario policy / actor references ────────────────────
		for (const ref of scenarioRefs) {
			if (ref.policyId && !workspacePolicyIds.has(ref.policyId)) {
				diagnostics.push({
					severity: "error",
					message: `Scenario "policy" target "${ref.policyId}" does not reference an existing Policy block ID in workspace`,
					blockId: ref.blockId,
					path: module.filePath,
				});
			}
			if (ref.actorId && !workspaceActorIds.has(ref.actorId)) {
				diagnostics.push({
					severity: "error",
					message: `Scenario "actor" target "${ref.actorId}" does not reference an existing Actor block ID in workspace`,
					blockId: ref.blockId,
					path: module.filePath,
				});
			}
		}
	}

	return diagnostics;
}

function collectTypedIds(blocks: Block[], actorIds: Set<string>, policyIds: Set<string>): void {
	for (const block of blocks) {
		if ("id" in block && typeof block.id === "string") {
			if (block.type === "Actor") actorIds.add(block.id);
			if (block.type === "Policy") policyIds.add(block.id);
		}
		if ("children" in block && Array.isArray(block.children)) {
			collectTypedIds(block.children as Block[], actorIds, policyIds);
		}
	}
}

function collectRefs(
	blocks: Block[],
	links: LinkTarget[],
	actorRefs: ActorReference[],
	scenarioRefs: ScenarioReference[],
): void {
	for (const block of blocks) {
		if (block.type === "Link") {
			links.push({ id: block.id, from: block.from, to: block.to });
		}

		if ((block.type === "Policy" || block.type === "Constraint") && Array.isArray(block.actor)) {
			actorRefs.push({
				blockId: block.id,
				actorIds: block.actor as string[],
				context: `${block.type} "${block.id}"`,
			});
		}

		if (block.type === "Scenario") {
			scenarioRefs.push({
				blockId: block.id,
				policyId: block.policy,
				actorId: block.actor,
			});
		}

		if ("children" in block && Array.isArray(block.children)) {
			collectRefs(block.children as Block[], links, actorRefs, scenarioRefs);
		}
	}
}
