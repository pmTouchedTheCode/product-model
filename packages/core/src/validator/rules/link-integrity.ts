import type { Block, PMDocument } from "../../types/ast.js";
import type { ValidationDiagnostic } from "../../types/validation.js";

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
 * Check that all reference targets resolve to existing block IDs:
 * - Link `from` / `to`
 * - Policy / Constraint `actor` list
 * - Scenario `policy` and `actor` references
 */
export function checkLinkIntegrity(document: PMDocument): ValidationDiagnostic[] {
	const diagnostics: ValidationDiagnostic[] = [];
	const allIds = new Set<string>();
	const links: LinkTarget[] = [];
	const actorRefs: ActorReference[] = [];
	const scenarioRefs: ScenarioReference[] = [];

	collectRefs(document.blocks, allIds, links, actorRefs, scenarioRefs);

	// ── Link from/to ──────────────────────────────────────────
	for (const link of links) {
		if (!allIds.has(link.from)) {
			diagnostics.push({
				severity: "error",
				message: `Link "from" target "${link.from}" does not reference an existing block ID`,
				blockId: link.id,
			});
		}
		if (!allIds.has(link.to)) {
			diagnostics.push({
				severity: "error",
				message: `Link "to" target "${link.to}" does not reference an existing block ID`,
				blockId: link.id,
			});
		}
	}

	// ── Actor references (Policy / Constraint actor lists) ────
	for (const ref of actorRefs) {
		for (const actorId of ref.actorIds) {
			if (!allIds.has(actorId)) {
				diagnostics.push({
					severity: "error",
					message: `${ref.context} actor "${actorId}" does not reference an existing Actor block ID`,
					blockId: ref.blockId,
				});
			}
		}
	}

	// ── Scenario policy / actor references ────────────────────
	for (const ref of scenarioRefs) {
		if (ref.policyId && !allIds.has(ref.policyId)) {
			diagnostics.push({
				severity: "error",
				message: `Scenario "policy" target "${ref.policyId}" does not reference an existing block ID`,
				blockId: ref.blockId,
			});
		}
		if (ref.actorId && !allIds.has(ref.actorId)) {
			diagnostics.push({
				severity: "error",
				message: `Scenario "actor" target "${ref.actorId}" does not reference an existing Actor block ID`,
				blockId: ref.blockId,
			});
		}
	}

	return diagnostics;
}

function collectRefs(
	blocks: Block[],
	allIds: Set<string>,
	links: LinkTarget[],
	actorRefs: ActorReference[],
	scenarioRefs: ScenarioReference[],
): void {
	for (const block of blocks) {
		if ("id" in block && typeof block.id === "string") {
			allIds.add(block.id);
		}

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
			collectRefs(block.children as Block[], allIds, links, actorRefs, scenarioRefs);
		}
	}
}
