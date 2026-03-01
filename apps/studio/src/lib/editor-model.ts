export type BlockType =
	| "Feature"
	| "Section"
	| "Definition"
	| "Policy"
	| "Constraint"
	| "Link"
	| "Logic";

interface PMFieldSpec {
	name: string;
	type: "string" | "number" | "boolean" | "datetime" | "enum";
	required: boolean;
	description?: string;
	enumValues?: string[];
	default?: string | number | boolean;
}

interface PMFeatureBlock {
	type: "Feature";
	id: string;
	name: string;
	description?: string;
	content?: string;
	children?: PMBlock[];
}

interface PMSectionBlock {
	type: "Section";
	id: string;
	name: string;
	status?: "draft" | "proposed" | "approved" | "deprecated";
	description?: string;
	content?: string;
	children?: PMBlock[];
}

interface PMDefinitionBlock {
	type: "Definition";
	id: string;
	name: string;
	version: string;
	description?: string;
	content?: string;
	fields: PMFieldSpec[];
}

interface PMPolicyBlock {
	type: "Policy";
	id: string;
	name: string;
	description?: string;
	content?: string;
	rule: string;
	enforcement: "must" | "should" | "may";
	children?: PMLogicBlock[];
}

interface PMConstraintBlock {
	type: "Constraint";
	id: string;
	name: string;
	description?: string;
	content?: string;
	condition: string;
}

interface PMLinkBlock {
	type: "Link";
	id?: string;
	description?: string;
	content?: string;
	from: string;
	to: string;
	relationship: "depends-on" | "extends" | "conflicts-with" | "implements";
}

interface PMLogicBlock {
	type: "Logic";
	id: string;
	name: string;
	description?: string;
	content?: string;
}

type PMBlock =
	| PMFeatureBlock
	| PMSectionBlock
	| PMDefinitionBlock
	| PMPolicyBlock
	| PMConstraintBlock
	| PMLinkBlock
	| PMLogicBlock;

export interface PMDocumentModel {
	version: string;
	title: string;
	description?: string;
	blocks: PMBlock[];
}

const ROOT_BLOCK_TYPES: BlockType[] = ["Feature"];

const GRAMMAR_TABLE: Record<BlockType, readonly BlockType[]> = {
	Feature: ["Section", "Definition", "Policy", "Constraint", "Link", "Logic"],
	Section: ["Section", "Definition", "Policy", "Constraint", "Link"],
	Definition: [],
	Policy: ["Logic"],
	Constraint: [],
	Link: [],
	Logic: [],
};

export interface EditorFieldSpec {
	name: string;
	type: "string" | "number" | "boolean" | "datetime" | "enum";
	required: boolean;
	description?: string;
	enumValues?: string[];
	default?: string | number | boolean;
}

export interface EditorBlock {
	uiId: string;
	type: BlockType;
	id?: string;
	name?: string;
	status?: "draft" | "proposed" | "approved" | "deprecated";
	description?: string;
	version?: string;
	rule?: string;
	enforcement?: "must" | "should" | "may";
	condition?: string;
	from?: string;
	to?: string;
	relationship?: "depends-on" | "extends" | "conflicts-with" | "implements";
	fields?: EditorFieldSpec[];
	children?: EditorBlock[];
}

export interface EditorMetadata {
	title: string;
	version: string;
	description?: string;
}

let idCounter = 0;

function nextUiId(): string {
	idCounter += 1;
	return `ui-${idCounter}`;
}

function mapField(field: PMFieldSpec): EditorFieldSpec {
	return {
		name: field.name,
		type: field.type,
		required: field.required,
		description: field.description,
		enumValues: field.enumValues,
		default: field.default,
	};
}

function mapBlock(block: PMBlock): EditorBlock {
	const base: EditorBlock = {
		uiId: nextUiId(),
		type: block.type,
		id: "id" in block ? block.id : undefined,
		name: "name" in block ? block.name : undefined,
		description: block.content ?? block.description ?? "",
	};

	switch (block.type) {
		case "Feature":
		case "Section":
			base.children = (block.children ?? []).map(mapBlock);
			if (block.type === "Section") {
				base.status = block.status;
			}
			break;
		case "Definition":
			base.version = block.version;
			base.fields = block.fields.map(mapField);
			break;
		case "Policy":
			base.rule = block.rule;
			base.enforcement = block.enforcement;
			base.children = (block.children ?? []).map(mapBlock);
			break;
		case "Constraint":
			base.condition = block.condition;
			break;
		case "Link":
			base.from = block.from;
			base.to = block.to;
			base.relationship = block.relationship;
			break;
		case "Logic":
			break;
	}

	return base;
}

export function fromPMDocument(document: PMDocumentModel): EditorBlock[] {
	idCounter = 0;
	return document.blocks.map(mapBlock);
}

export function toParseMeta(metadata: EditorMetadata): EditorMetadata {
	return {
		title: metadata.title.trim() || "Untitled",
		version: metadata.version.trim() || "1.0.0",
		description: metadata.description?.trim() || undefined,
	};
}

export function getAllowedChildTypes(parentType: BlockType | null): BlockType[] {
	if (parentType === null) {
		return [...ROOT_BLOCK_TYPES];
	}
	return [...GRAMMAR_TABLE[parentType]];
}

export function canHaveChildren(type: BlockType): boolean {
	return GRAMMAR_TABLE[type].length > 0;
}

export function canNest(parentType: BlockType | null, childType: BlockType): boolean {
	return getAllowedChildTypes(parentType).includes(childType);
}

export function newBlockForType(type: BlockType): EditorBlock {
	const base: EditorBlock = {
		uiId: nextUiId(),
		type,
		description: "",
	};

	switch (type) {
		case "Feature":
			return { ...base, id: "new-feature", name: "New Feature", children: [] };
		case "Section":
			return { ...base, id: "new-section", name: "New Section", status: "draft", children: [] };
		case "Definition":
			return {
				...base,
				id: "new-definition",
				name: "New Definition",
				version: "1.0.0",
				fields: [{ name: "field", type: "string", required: true }],
			};
		case "Policy":
			return {
				...base,
				id: "new-policy",
				name: "New Policy",
				rule: "Define policy rule",
				enforcement: "must",
				children: [],
			};
		case "Constraint":
			return {
				...base,
				id: "new-constraint",
				name: "New Constraint",
				condition: "Define condition",
			};
		case "Link":
			return {
				...base,
				id: "",
				from: "source-id",
				to: "target-id",
				relationship: "depends-on",
			};
		case "Logic":
			return {
				...base,
				id: "new-logic",
				name: "New Logic",
			};
	}
}

interface LocatedBlock {
	block: EditorBlock;
	parentId: string | null;
	index: number;
}

function findBlock(
	blocks: EditorBlock[],
	uiId: string,
	parentId: string | null = null,
): LocatedBlock | null {
	for (const [index, block] of blocks.entries()) {
		if (block.uiId === uiId) {
			return { block, parentId, index };
		}
		const found = findBlock(block.children ?? [], uiId, block.uiId);
		if (found) {
			return found;
		}
	}
	return null;
}

function updateTree(
	blocks: EditorBlock[],
	uiId: string,
	updater: (block: EditorBlock) => EditorBlock,
): EditorBlock[] {
	return blocks.map((block) => {
		if (block.uiId === uiId) {
			return updater(block);
		}
		if (!block.children?.length) {
			return block;
		}
		return {
			...block,
			children: updateTree(block.children, uiId, updater),
		};
	});
}

export function updateBlock(
	blocks: EditorBlock[],
	uiId: string,
	next: Partial<EditorBlock>,
): EditorBlock[] {
	return updateTree(blocks, uiId, (block) => ({ ...block, ...next }));
}

export function removeBlock(blocks: EditorBlock[], uiId: string): EditorBlock[] {
	const filtered = blocks
		.filter((block) => block.uiId !== uiId)
		.map((block) => {
			if (!block.children?.length) {
				return block;
			}
			return {
				...block,
				children: removeBlock(block.children, uiId),
			};
		});

	return filtered;
}

function removeAndReturn(
	blocks: EditorBlock[],
	uiId: string,
): { nextBlocks: EditorBlock[]; removed: EditorBlock | null } {
	let removed: EditorBlock | null = null;

	function walk(nodes: EditorBlock[]): EditorBlock[] {
		const result: EditorBlock[] = [];

		for (const node of nodes) {
			if (node.uiId === uiId) {
				removed = node;
				continue;
			}

			if (node.children?.length) {
				result.push({
					...node,
					children: walk(node.children),
				});
				continue;
			}

			result.push(node);
		}

		return result;
	}

	return {
		nextBlocks: walk(blocks),
		removed,
	};
}

function insertIntoParent(
	blocks: EditorBlock[],
	parentId: string | null,
	blockToInsert: EditorBlock,
	index?: number,
): EditorBlock[] {
	if (parentId === null) {
		const next = [...blocks];
		const targetIndex = index ?? next.length;
		next.splice(targetIndex, 0, blockToInsert);
		return next;
	}

	return updateTree(blocks, parentId, (parent) => {
		const nextChildren = [...(parent.children ?? [])];
		const targetIndex = index ?? nextChildren.length;
		nextChildren.splice(targetIndex, 0, blockToInsert);
		return {
			...parent,
			children: nextChildren,
		};
	});
}

export function addChildBlock(
	blocks: EditorBlock[],
	parentId: string | null,
	newBlock: EditorBlock,
): { blocks: EditorBlock[]; error?: string } {
	if (parentId === null && !canNest(null, newBlock.type)) {
		return { blocks, error: `${newBlock.type} cannot be added at root` };
	}

	if (parentId !== null) {
		const parent = findBlock(blocks, parentId);
		if (!parent) {
			return { blocks, error: "Parent block not found" };
		}
		if (!canNest(parent.block.type, newBlock.type)) {
			return { blocks, error: `${newBlock.type} is not allowed inside ${parent.block.type}` };
		}
	}

	return {
		blocks: insertIntoParent(blocks, parentId, newBlock),
	};
}

export function reorderInParent(
	blocks: EditorBlock[],
	activeId: string,
	overId: string,
): { blocks: EditorBlock[]; error?: string } {
	const active = findBlock(blocks, activeId);
	const over = findBlock(blocks, overId);

	if (!active || !over) {
		return { blocks, error: "Drag target not found" };
	}

	if (active.parentId !== over.parentId) {
		return { blocks, error: "Blocks must share a parent to reorder" };
	}

	const removedResult = removeAndReturn(blocks, activeId);
	if (!removedResult.removed) {
		return { blocks, error: "Dragged block missing" };
	}

	const overInNext = findBlock(removedResult.nextBlocks, overId);
	if (!overInNext) {
		return { blocks, error: "Drop target missing" };
	}

	const inserted = insertIntoParent(
		removedResult.nextBlocks,
		overInNext.parentId,
		removedResult.removed,
		overInNext.index,
	);

	return { blocks: inserted };
}

export function moveIntoContainer(
	blocks: EditorBlock[],
	activeId: string,
	targetParentId: string | null,
): { blocks: EditorBlock[]; error?: string } {
	const located = findBlock(blocks, activeId);
	if (!located) {
		return { blocks, error: "Dragged block not found" };
	}

	if (targetParentId === activeId) {
		return { blocks, error: "Cannot move a block into itself" };
	}

	if (targetParentId !== null) {
		const parent = findBlock(blocks, targetParentId);
		if (!parent) {
			return { blocks, error: "Target parent not found" };
		}
		if (!canNest(parent.block.type, located.block.type)) {
			return { blocks, error: `${located.block.type} is not allowed inside ${parent.block.type}` };
		}
	} else if (!canNest(null, located.block.type)) {
		return { blocks, error: `${located.block.type} cannot be placed at root` };
	}

	const removed = removeAndReturn(blocks, activeId);
	if (!removed.removed) {
		return { blocks, error: "Dragged block missing after remove" };
	}

	return {
		blocks: insertIntoParent(removed.nextBlocks, targetParentId, removed.removed),
	};
}

export function findBlockById(blocks: EditorBlock[], uiId: string): EditorBlock | null {
	return findBlock(blocks, uiId)?.block ?? null;
}

export function allBlockIds(blocks: EditorBlock[]): string[] {
	const ids: string[] = [];

	function walk(nodes: EditorBlock[]): void {
		for (const node of nodes) {
			if (node.id) {
				ids.push(node.id);
			}
			if (node.children?.length) {
				walk(node.children);
			}
		}
	}

	walk(blocks);
	return ids;
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function indent(level: number): string {
	return "  ".repeat(level);
}

function serializeFields(fields: EditorFieldSpec[]): string {
	const normalized = fields.map((field) => {
		const next: Record<string, unknown> = {
			name: field.name,
			type: field.type,
			required: field.required,
		};
		if (field.description) {
			next.description = field.description;
		}
		if (field.enumValues?.length) {
			next.enumValues = field.enumValues;
		}
		if (field.default !== undefined && field.default !== "") {
			next.default = field.default;
		}
		return next;
	});

	return JSON.stringify(normalized);
}

function serializeAttributes(block: EditorBlock): string {
	const attrs: Array<[string, string]> = [];

	switch (block.type) {
		case "Feature":
		case "Section":
		case "Definition":
		case "Policy":
		case "Constraint":
		case "Logic":
			attrs.push(["id", block.id ?? ""]);
			attrs.push(["name", block.name ?? ""]);
			break;
		case "Link":
			if (block.id?.trim()) {
				attrs.push(["id", block.id]);
			}
			break;
	}

	switch (block.type) {
		case "Section":
			if (block.status) {
				attrs.push(["status", block.status]);
			}
			break;
		case "Definition":
			attrs.push(["version", block.version ?? "1.0.0"]);
			attrs.push(["fields", serializeFields(block.fields ?? [])]);
			break;
		case "Policy":
			attrs.push(["rule", block.rule ?? ""]);
			attrs.push(["enforcement", block.enforcement ?? "must"]);
			break;
		case "Constraint":
			attrs.push(["condition", block.condition ?? ""]);
			break;
		case "Link":
			attrs.push(["from", block.from ?? ""]);
			attrs.push(["to", block.to ?? ""]);
			attrs.push(["relationship", block.relationship ?? "depends-on"]);
			break;
		case "Feature":
		case "Logic":
			break;
	}

	return attrs
		.map(([key, value]) => {
			if (key === "fields") {
				return `${key}='${escapeAttr(value)}'`;
			}
			return `${key}="${escapeAttr(value)}"`;
		})
		.join(" ");
}

function serializeBlock(block: EditorBlock, level: number): string {
	const attrs = serializeAttributes(block);
	const openTag = attrs.length > 0 ? `<${block.type} ${attrs}>` : `<${block.type}>`;
	const body = block.description?.trim();
	const children = block.children ?? [];

	if (!body && children.length === 0) {
		return `${indent(level)}${openTag}</${block.type}>`;
	}

	const lines: string[] = [`${indent(level)}${openTag}`];

	if (body) {
		lines.push(`${indent(level + 1)}${body}`);
	}

	for (const child of children) {
		lines.push(serializeBlock(child, level + 1));
	}

	lines.push(`${indent(level)}</${block.type}>`);
	return lines.join("\n");
}

export function serializeProductMdx(metadata: EditorMetadata, blocks: EditorBlock[]): string {
	const safeMeta = toParseMeta(metadata);
	const headerLines = [`{/* title: ${safeMeta.title} */}`, `{/* version: ${safeMeta.version} */}`];

	if (safeMeta.description) {
		headerLines.push(`{/* description: ${safeMeta.description} */}`);
	}

	const body = blocks.map((block) => serializeBlock(block, 0)).join("\n\n");
	return `${headerLines.join("\n")}\n\n${body}\n`;
}

export interface ParsedHeaderMetadata {
	title?: string;
	version?: string;
	description?: string;
}

export function parseHeaderMetadata(source: string): ParsedHeaderMetadata {
	const meta: ParsedHeaderMetadata = {};

	const titleMatch = source.match(/\{\/\*\s*title:\s*([^*]+?)\s*\*\/\}/i);
	if (titleMatch?.[1]) {
		meta.title = titleMatch[1].trim();
	}

	const versionMatch = source.match(/\{\/\*\s*version:\s*([^*]+?)\s*\*\/\}/i);
	if (versionMatch?.[1]) {
		meta.version = versionMatch[1].trim();
	}

	const descriptionMatch = source.match(/\{\/\*\s*description:\s*([^*]+?)\s*\*\/\}/i);
	if (descriptionMatch?.[1]) {
		meta.description = descriptionMatch[1].trim();
	}

	return meta;
}
