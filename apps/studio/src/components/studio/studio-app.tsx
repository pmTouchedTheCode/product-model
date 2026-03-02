"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
	type EditorBlock,
	type EditorMetadata,
	type PMDocumentModel,
	addChildBlock,
	allBlockIds,
	canHaveChildren,
	fromPMDocument,
	getAllowedChildTypes,
	moveIntoContainer,
	newBlockForType,
	parseHeaderMetadata,
	removeBlock,
	reorderInParent,
	serializeProductMdx,
	updateBlock,
} from "@/lib/editor-model";
import { cn } from "@/lib/utils";
import {
	DndContext,
	type DragEndEvent,
	PointerSensor,
	closestCenter,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	AlertTriangle,
	ChevronDown,
	ChevronRight,
	Code,
	FilePenLine,
	GripVertical,
	Loader2,
	Moon,
	PanelLeft,
	Plus,
	RefreshCcw,
	Save,
	Sun,
	Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

interface ProductFileEntry {
	path: string;
	name: string;
	dir: string;
}

interface ProductFileResponse {
	path: string;
	content: string;
	metadata: EditorMetadata;
}

interface ValidationDiagnostic {
	severity: "error" | "warning" | "info";
	message: string;
	blockId?: string;
	path?: string;
}

const enforcementLevels = ["must", "should", "may"] as const;
const relationTypes = ["depends-on", "extends", "conflicts-with", "implements"] as const;
const statusOptions = ["draft", "proposed", "approved", "deprecated"] as const;
const fieldTypeOptions = ["string", "number", "boolean", "datetime", "enum"] as const;

const blockTypeColors: Record<string, string> = {
	Feature: "border-violet-500/50 bg-violet-500/10 text-violet-400 dark:text-violet-300",
	Section: "border-blue-500/50 bg-blue-500/10 text-blue-500 dark:text-blue-300",
	Definition: "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
	Policy: "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-300",
	Constraint: "border-rose-500/50 bg-rose-500/10 text-rose-500 dark:text-rose-300",
	Link: "border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
	Logic: "border-purple-500/50 bg-purple-500/10 text-purple-500 dark:text-purple-300",
};

function parseContainerId(id: string): string | null | undefined {
	if (!id.startsWith("container:")) {
		return undefined;
	}
	const raw = id.replace("container:", "");
	return raw === "root" ? null : raw;
}

function DiagnosticsBadge({
	diagnostics,
}: { diagnostics: ValidationDiagnostic[] }): React.JSX.Element {
	const hasError = diagnostics.some((item) => item.severity === "error");
	const hasWarning = diagnostics.some((item) => item.severity === "warning");

	if (hasError) {
		return <Badge variant="destructive">{diagnostics.length} issues</Badge>;
	}
	if (hasWarning) {
		return <Badge variant="secondary">{diagnostics.length} warnings</Badge>;
	}
	if (diagnostics.length > 0) {
		return <Badge variant="outline">{diagnostics.length} notes</Badge>;
	}
	return <Badge variant="default">Valid</Badge>;
}

function DropContainer({
	id,
	children,
	className,
}: {
	id: string;
	children: React.ReactNode;
	className?: string;
}): React.JSX.Element {
	const { isOver, setNodeRef } = useDroppable({ id });

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"rounded border border-dashed border-transparent p-1",
				isOver && "border-primary/40 bg-primary/5",
				className,
			)}
		>
			{children}
		</div>
	);
}

function StudioEditorBlock({
	block,
	onUpdate,
	onDelete,
	onAddChild,
	onFocus,
	focusedBlockId,
}: {
	block: EditorBlock;
	onUpdate: (id: string, next: Partial<EditorBlock>) => void;
	onDelete: (id: string) => void;
	onAddChild: (parentId: string, type: EditorBlock["type"]) => void;
	onFocus: (id: string) => void;
	focusedBlockId: string | null;
}): React.JSX.Element {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: block.uiId,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const childTypes = useMemo(() => getAllowedChildTypes(block.type), [block.type]);
	const focused = focusedBlockId === block.uiId;
	const badgeColor = blockTypeColors[block.type] ?? "";

	return (
		<div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
			<div
				className={cn(
					"rounded border transition-colors",
					focused ? "border-primary/50 bg-accent/50" : "border-transparent hover:border-border",
				)}
			>
				{/* Header row */}
				<div
					className="flex cursor-pointer items-center gap-2 px-3 py-2"
					onClick={() => onFocus(focused ? "" : block.uiId)}
				>
					<button
						{...attributes}
						{...listeners}
						className="cursor-grab text-muted-foreground hover:text-foreground"
					>
						<GripVertical className="h-3.5 w-3.5" />
					</button>
					<span
						className={cn(
							"inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
							badgeColor,
						)}
					>
						{block.type}
					</span>
					<span className="flex-1 truncate text-sm font-medium">
						{block.name || block.id || "Untitled"}
					</span>
					{block.id ? (
						<span className="font-[var(--font-mono)] text-[11px] text-muted-foreground">
							#{block.id}
						</span>
					) : null}
					<div className="flex items-center gap-1">
						{canHaveChildren(block.type) ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										size="sm"
										variant="ghost"
										className="h-6 px-1.5"
										onClick={(event) => event.stopPropagation()}
									>
										<Plus className="h-3 w-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{childTypes.map((type) => (
										<DropdownMenuItem key={type} onClick={() => onAddChild(block.uiId, type)}>
											{type}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
						<Button
							size="sm"
							variant="ghost"
							className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
							onClick={(event) => {
								event.stopPropagation();
								onDelete(block.uiId);
							}}
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
				</div>

				{/* Description preview (collapsed) */}
				{!focused && block.description ? (
					<div className="truncate px-3 pb-2 text-xs text-muted-foreground">
						{block.description}
					</div>
				) : null}

				{/* Expanded edit form */}
				{focused ? (
					<div className="space-y-3 border-t px-3 pb-3 pt-2">
						{block.type !== "Link" ? (
							<>
								<div className="grid gap-1.5">
									<Label className="text-xs text-muted-foreground">ID</Label>
									<Input
										value={block.id ?? ""}
										onChange={(event) => onUpdate(block.uiId, { id: event.target.value })}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label className="text-xs text-muted-foreground">Name</Label>
									<Input
										value={block.name ?? ""}
										onChange={(event) => onUpdate(block.uiId, { name: event.target.value })}
									/>
								</div>
							</>
						) : (
							<div className="grid gap-1.5">
								<Label className="text-xs text-muted-foreground">Optional Link ID</Label>
								<Input
									value={block.id ?? ""}
									onChange={(event) => onUpdate(block.uiId, { id: event.target.value })}
								/>
							</div>
						)}

						{block.type === "Section" ? (
							<div className="grid gap-1.5">
								<Label className="text-xs text-muted-foreground">Status</Label>
								<div className="flex flex-wrap gap-1.5">
									{statusOptions.map((status) => (
										<Button
											key={status}
											variant={block.status === status ? "default" : "outline"}
											size="sm"
											onClick={() => onUpdate(block.uiId, { status })}
										>
											{status}
										</Button>
									))}
								</div>
							</div>
						) : null}

						{block.type === "Definition" ? (
							<>
								<div className="grid gap-1.5">
									<Label className="text-xs text-muted-foreground">Version</Label>
									<Input
										value={block.version ?? "1.0.0"}
										onChange={(event) => onUpdate(block.uiId, { version: event.target.value })}
									/>
								</div>
								<div className="space-y-2 rounded border bg-muted/20 p-2">
									<div className="flex items-center justify-between">
										<Label className="text-xs text-muted-foreground">Fields</Label>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												const fields = [...(block.fields ?? [])];
												fields.push({
													name: "field",
													type: "string",
													required: true,
												});
												onUpdate(block.uiId, { fields });
											}}
										>
											<Plus className="h-3 w-3" /> Field
										</Button>
									</div>
									{(block.fields ?? []).map((field, index) => (
										<div
											className="grid gap-1.5 rounded border bg-background p-2"
											key={`${field.name}-${index}`}
										>
											<div className="grid gap-1.5 md:grid-cols-2">
												<Input
													value={field.name}
													onChange={(event) => {
														const fields = [...(block.fields ?? [])];
														fields[index] = {
															...field,
															name: event.target.value,
														};
														onUpdate(block.uiId, { fields });
													}}
												/>
												<div className="flex flex-wrap gap-1">
													{fieldTypeOptions.map((type) => (
														<Button
															key={type}
															variant={field.type === type ? "default" : "outline"}
															size="sm"
															onClick={() => {
																const fields = [...(block.fields ?? [])];
																fields[index] = { ...field, type };
																onUpdate(block.uiId, { fields });
															}}
														>
															{type}
														</Button>
													))}
												</div>
											</div>
											<div className="grid gap-1.5 md:grid-cols-2">
												<Input
													placeholder="enum values (comma separated)"
													value={field.enumValues?.join(",") ?? ""}
													onChange={(event) => {
														const fields = [...(block.fields ?? [])];
														fields[index] = {
															...field,
															enumValues: event.target.value
																.split(",")
																.map((item) => item.trim())
																.filter(Boolean),
														};
														onUpdate(block.uiId, { fields });
													}}
												/>
												<Button
													variant={field.required ? "default" : "outline"}
													size="sm"
													onClick={() => {
														const fields = [...(block.fields ?? [])];
														fields[index] = {
															...field,
															required: !field.required,
														};
														onUpdate(block.uiId, { fields });
													}}
												>
													Required
												</Button>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													const fields = [...(block.fields ?? [])];
													fields.splice(index, 1);
													onUpdate(block.uiId, { fields });
												}}
											>
												<Trash2 className="h-3 w-3" /> Remove
											</Button>
										</div>
									))}
								</div>
							</>
						) : null}

						{block.type === "Policy" ? (
							<>
								<div className="grid gap-1.5">
									<Label className="text-xs text-muted-foreground">Rule</Label>
									<Textarea
										value={block.rule ?? ""}
										onChange={(event) => onUpdate(block.uiId, { rule: event.target.value })}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label className="text-xs text-muted-foreground">Enforcement</Label>
									<div className="flex flex-wrap gap-1.5">
										{enforcementLevels.map((level) => (
											<Button
												key={level}
												variant={block.enforcement === level ? "default" : "outline"}
												size="sm"
												onClick={() => onUpdate(block.uiId, { enforcement: level })}
											>
												{level}
											</Button>
										))}
									</div>
								</div>
							</>
						) : null}

						{block.type === "Constraint" ? (
							<div className="grid gap-1.5">
								<Label className="text-xs text-muted-foreground">Condition</Label>
								<Textarea
									value={block.condition ?? ""}
									onChange={(event) => onUpdate(block.uiId, { condition: event.target.value })}
								/>
							</div>
						) : null}

						{block.type === "Link" ? (
							<>
								<div className="grid gap-1.5 md:grid-cols-2">
									<div className="grid gap-1.5">
										<Label className="text-xs text-muted-foreground">From</Label>
										<Input
											value={block.from ?? ""}
											onChange={(event) => onUpdate(block.uiId, { from: event.target.value })}
										/>
									</div>
									<div className="grid gap-1.5">
										<Label className="text-xs text-muted-foreground">To</Label>
										<Input
											value={block.to ?? ""}
											onChange={(event) => onUpdate(block.uiId, { to: event.target.value })}
										/>
									</div>
								</div>
								<div className="grid gap-1.5">
									<Label className="text-xs text-muted-foreground">Relationship</Label>
									<div className="flex flex-wrap gap-1.5">
										{relationTypes.map((type) => (
											<Button
												key={type}
												variant={block.relationship === type ? "default" : "outline"}
												size="sm"
												onClick={() => onUpdate(block.uiId, { relationship: type })}
											>
												{type}
											</Button>
										))}
									</div>
								</div>
							</>
						) : null}

						<div className="grid gap-1.5">
							<Label className="text-xs text-muted-foreground">Description / Body</Label>
							<Textarea
								value={block.description ?? ""}
								onChange={(event) => onUpdate(block.uiId, { description: event.target.value })}
							/>
						</div>
					</div>
				) : null}

				{/* Nested children */}
				{block.children?.length ? (
					<div className="ml-5 border-l pl-2">
						<DropContainer id={`container:${block.uiId}`}>
							<SortableContext
								items={block.children.map((child) => child.uiId)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-0.5 py-0.5">
									{block.children.map((child) => (
										<StudioEditorBlock
											key={child.uiId}
											block={child}
											onUpdate={onUpdate}
											onDelete={onDelete}
											onAddChild={onAddChild}
											onFocus={onFocus}
											focusedBlockId={focusedBlockId}
										/>
									))}
								</div>
							</SortableContext>
						</DropContainer>
					</div>
				) : null}
			</div>
		</div>
	);
}

export function StudioApp(): React.JSX.Element {
	const { resolvedTheme, setTheme } = useTheme();
	const [files, setFiles] = useState<ProductFileEntry[]>([]);
	const [search, setSearch] = useState("");
	const [activePath, setActivePath] = useState<string | null>(null);
	const [rawSource, setRawSource] = useState("");
	const [metadata, setMetadata] = useState<EditorMetadata>({ title: "", version: "1.0.0" });
	const [blocks, setBlocks] = useState<EditorBlock[]>([]);
	const [diagnostics, setDiagnostics] = useState<ValidationDiagnostic[]>([]);
	const [parseError, setParseError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
	const [newFilePath, setNewFilePath] = useState("models/new.product.mdx");
	const [renamePath, setRenamePath] = useState("");
	const [showNewDialog, setShowNewDialog] = useState(false);
	const [showRenameDialog, setShowRenameDialog] = useState(false);
	const [themeMounted, setThemeMounted] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [sourceOpen, setSourceOpen] = useState(false);
	const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	async function fetchFiles(nextActivePath?: string): Promise<void> {
		const response = await fetch("/api/product-files");
		const json = (await response.json()) as { files?: ProductFileEntry[]; error?: string };

		if (!response.ok || !json.files) {
			setMessage(json.error ?? "Failed to list files");
			return;
		}

		setFiles(json.files);
		if (!activePath && json.files.length > 0) {
			await openFile(json.files[0]?.path ?? "");
		}
		if (nextActivePath) {
			await openFile(nextActivePath);
		}
	}

	async function runValidation(
		source: string,
		nextMeta: EditorMetadata,
	): Promise<{
		doc: PMDocumentModel | null;
		diagnostics: ValidationDiagnostic[];
		error?: string;
	}> {
		const response = await fetch("/api/validate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ source, metadata: nextMeta }),
		});

		const json = (await response.json()) as {
			document?: PMDocumentModel;
			diagnostics?: ValidationDiagnostic[];
			error?: string;
		};

		if (!response.ok || !json.document) {
			return { doc: null, diagnostics: [], error: json.error ?? "Failed to parse/validate" };
		}

		return { doc: json.document, diagnostics: json.diagnostics ?? [] };
	}

	async function openFile(path: string): Promise<void> {
		setLoading(true);
		try {
			const response = await fetch(`/api/product-file?path=${encodeURIComponent(path)}`);
			const json = (await response.json()) as ProductFileResponse | { error: string };

			if (!response.ok || !("content" in json)) {
				setMessage("error" in json ? json.error : "Failed to open file");
				return;
			}

			setActivePath(json.path);
			setRawSource(json.content);
			setMetadata(json.metadata);
			setRenamePath(json.path);
			setFocusedBlockId(null);

			const result = await runValidation(json.content, json.metadata);
			if (result.doc) {
				setBlocks(fromPMDocument(result.doc));
				setDiagnostics(result.diagnostics);
				setParseError(null);
			} else {
				setParseError(result.error ?? "Parse failed");
				setDiagnostics([]);
			}
		} finally {
			setLoading(false);
		}
	}

	async function saveFile(): Promise<void> {
		if (!activePath) {
			return;
		}

		setSaving(true);
		setMessage(null);

		try {
			const sourceToSave = sourceOpen ? rawSource : serializeProductMdx(metadata, blocks);

			const response = await fetch("/api/product-file", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: activePath, content: sourceToSave }),
			});
			const json = (await response.json()) as { ok?: boolean; error?: string };

			if (!response.ok || !json.ok) {
				setMessage(json.error ?? "Failed to save file");
				return;
			}

			setRawSource(sourceToSave);
			setMessage("Saved");

			const result = await runValidation(sourceToSave, metadata);
			if (result.doc) {
				setBlocks(fromPMDocument(result.doc));
				setDiagnostics(result.diagnostics);
				setParseError(null);
			} else {
				setParseError(result.error ?? "Parse failed");
				setDiagnostics([]);
			}
		} finally {
			setSaving(false);
		}
	}

	async function applyRawToVisual(): Promise<void> {
		const headerMeta = parseHeaderMetadata(rawSource);
		const mergedMeta: EditorMetadata = {
			title: headerMeta.title ?? metadata.title,
			version: headerMeta.version ?? metadata.version,
			description: headerMeta.description ?? metadata.description,
		};

		const result = await runValidation(rawSource, mergedMeta);
		if (!result.doc) {
			setParseError(result.error ?? "Failed to parse source");
			setMessage("Raw source has parse errors");
			return;
		}

		setMetadata(mergedMeta);
		setBlocks(fromPMDocument(result.doc));
		setDiagnostics(result.diagnostics);
		setParseError(null);
		setMessage("Visual model updated from raw source");
	}

	async function validateCurrent(): Promise<void> {
		const source = sourceOpen ? rawSource : serializeProductMdx(metadata, blocks);
		const result = await runValidation(source, metadata);
		if (result.doc) {
			setDiagnostics(result.diagnostics);
			setParseError(null);
			setBlocks(fromPMDocument(result.doc));
			setMessage("Validation complete");
			return;
		}
		setParseError(result.error ?? "Parse failed");
		setDiagnostics([]);
		setMessage("Validation failed due to parse issues");
	}

	async function createFile(): Promise<void> {
		const response = await fetch("/api/product-file", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ path: newFilePath, metadata }),
		});

		const json = (await response.json()) as {
			ok?: boolean;
			path?: string;
			error?: string;
		};
		if (!response.ok || !json.ok || !json.path) {
			setMessage(json.error ?? "Failed to create file");
			return;
		}

		setShowNewDialog(false);
		setMessage(`Created ${json.path}`);
		await fetchFiles(json.path);
	}

	async function renameFile(): Promise<void> {
		if (!activePath) {
			return;
		}
		const response = await fetch("/api/product-file", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fromPath: activePath, toPath: renamePath }),
		});
		const json = (await response.json()) as {
			ok?: boolean;
			path?: string;
			error?: string;
		};
		if (!response.ok || !json.ok || !json.path) {
			setMessage(json.error ?? "Failed to rename file");
			return;
		}
		setShowRenameDialog(false);
		setMessage(`Renamed to ${json.path}`);
		await fetchFiles(json.path);
	}

	async function deleteFile(): Promise<void> {
		if (!activePath) {
			return;
		}
		const confirmed = window.confirm(`Delete ${activePath}?`);
		if (!confirmed) {
			return;
		}

		const response = await fetch(`/api/product-file?path=${encodeURIComponent(activePath)}`, {
			method: "DELETE",
		});
		const json = (await response.json()) as { ok?: boolean; error?: string };
		if (!response.ok || !json.ok) {
			setMessage(json.error ?? "Failed to delete file");
			return;
		}

		setActivePath(null);
		setRawSource("");
		setBlocks([]);
		setDiagnostics([]);
		setParseError(null);
		setMessage("Deleted");
		await fetchFiles();
	}

	function handleAddRoot(type: EditorBlock["type"]): void {
		const block = newBlockForType(type);
		const next = addChildBlock(blocks, null, block);
		if (next.error) {
			setMessage(next.error);
			return;
		}
		setBlocks(next.blocks);
	}

	function handleAddChild(parentId: string, type: EditorBlock["type"]): void {
		const block = newBlockForType(type);
		const next = addChildBlock(blocks, parentId, block);
		if (next.error) {
			setMessage(next.error);
			return;
		}
		setBlocks(next.blocks);
	}

	function handleDragEnd(event: DragEndEvent): void {
		const activeId = String(event.active.id);
		const overId = event.over ? String(event.over.id) : null;

		if (!overId || activeId === overId) {
			return;
		}

		const container = parseContainerId(overId);
		if (container !== undefined) {
			const moved = moveIntoContainer(blocks, activeId, container);
			if (moved.error) {
				setMessage(moved.error);
				return;
			}
			setBlocks(moved.blocks);
			return;
		}

		const reordered = reorderInParent(blocks, activeId, overId);
		if (!reordered.error) {
			setBlocks(reordered.blocks);
			return;
		}

		const nested = moveIntoContainer(blocks, activeId, overId);
		if (nested.error) {
			setMessage(nested.error);
			return;
		}
		setBlocks(nested.blocks);
	}

	const filteredFiles = useMemo(() => {
		if (!search.trim()) {
			return files;
		}
		const lowered = search.toLowerCase();
		return files.filter((file) => file.path.toLowerCase().includes(lowered));
	}, [files, search]);

	const blockIdToUiId = useMemo(() => {
		const map = new Map<string, string>();
		function walk(nodes: EditorBlock[]): void {
			for (const node of nodes) {
				if (node.id) {
					map.set(node.id, node.uiId);
				}
				if (node.children?.length) {
					walk(node.children);
				}
			}
		}
		walk(blocks);
		return map;
	}, [blocks]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: initial fetch runs once on mount.
	useEffect(() => {
		void fetchFiles();
	}, []);

	useEffect(() => {
		setThemeMounted(true);
	}, []);

	const rootChildTypes = getAllowedChildTypes(null);
	const isDarkTheme = resolvedTheme === "dark";

	return (
		<div className="flex h-screen flex-col">
			{/* Header */}
			<header className="flex items-center justify-between border-b px-4 py-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setSidebarOpen(!sidebarOpen)}
						className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
					>
						<PanelLeft className="h-4 w-4" />
					</button>
					<span className="text-sm font-semibold">Product Studio</span>
					{activePath ? (
						<span className="font-[var(--font-mono)] text-xs text-muted-foreground">
							{activePath}
						</span>
					) : null}
				</div>
				<div className="flex items-center gap-1.5">
					<DiagnosticsBadge diagnostics={diagnostics} />
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
						aria-label="Toggle theme"
						disabled={!themeMounted}
					>
						{isDarkTheme ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
					</Button>
					<Button variant="ghost" size="sm" onClick={() => void validateCurrent()}>
						<RefreshCcw className="h-3.5 w-3.5" /> Validate
					</Button>
					<Button size="sm" onClick={() => void saveFile()} disabled={!activePath || saving}>
						{saving ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Save className="h-3.5 w-3.5" />
						)}
						Save
					</Button>
				</div>
			</header>

			{/* Main layout */}
			<div className="flex min-h-0 flex-1">
				{/* Sidebar */}
				{sidebarOpen ? (
					<aside className="flex w-60 shrink-0 flex-col border-r">
						<div className="flex items-center justify-between px-3 py-2">
							<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Files
							</span>
							<Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
								<DialogTrigger asChild>
									<Button size="sm" variant="ghost" className="h-6 px-1.5">
										<Plus className="h-3.5 w-3.5" />
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Create Product File</DialogTitle>
										<DialogDescription>
											Create a new `.product.mdx` file anywhere in the workspace root.
										</DialogDescription>
									</DialogHeader>
									<div className="grid gap-2">
										<Label>Path</Label>
										<Input
											value={newFilePath}
											onChange={(event) => setNewFilePath(event.target.value)}
										/>
									</div>
									<DialogFooter>
										<Button onClick={() => void createFile()}>Create</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
						<div className="px-2 pb-2">
							<Input
								placeholder="Search files..."
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								className="h-7 text-xs"
							/>
						</div>
						<ScrollArea className="flex-1 px-1">
							<div className="space-y-0.5">
								{filteredFiles.map((file) => (
									<button
										type="button"
										key={file.path}
										className={cn(
											"flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
											activePath === file.path && "bg-accent text-accent-foreground",
										)}
										onClick={() => void openFile(file.path)}
									>
										<FilePenLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
										<span className="truncate">{file.name}</span>
									</button>
								))}
							</div>
						</ScrollArea>
					</aside>
				) : null}

				{/* Main content area */}
				<div className="flex min-h-0 flex-1 flex-col">
					{/* Toolbar */}
					<div className="flex items-center justify-between border-b px-4 py-2">
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-2">
								<Label className="text-xs text-muted-foreground">Title</Label>
								<Input
									className="h-7 w-48 text-sm"
									value={metadata.title}
									onChange={(event) =>
										setMetadata((prev) => ({
											...prev,
											title: event.target.value,
										}))
									}
								/>
							</div>
							<div className="flex items-center gap-2">
								<Label className="text-xs text-muted-foreground">Version</Label>
								<Input
									className="h-7 w-24 text-sm"
									value={metadata.version}
									onChange={(event) =>
										setMetadata((prev) => ({
											...prev,
											version: event.target.value,
										}))
									}
								/>
							</div>
						</div>
						<div className="flex items-center gap-1.5">
							<Button
								size="sm"
								variant={sourceOpen ? "secondary" : "ghost"}
								onClick={() => setSourceOpen(!sourceOpen)}
							>
								<Code className="h-3.5 w-3.5" /> Source
							</Button>
							<Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
								<DialogTrigger asChild>
									<Button size="sm" variant="ghost" disabled={!activePath}>
										Rename
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Rename Product File</DialogTitle>
									</DialogHeader>
									<div className="grid gap-2">
										<Label>New Path</Label>
										<Input
											value={renamePath}
											onChange={(event) => setRenamePath(event.target.value)}
										/>
									</div>
									<DialogFooter>
										<Button onClick={() => void renameFile()}>Rename</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
							<Button
								size="sm"
								variant="ghost"
								className="text-destructive hover:text-destructive"
								disabled={!activePath}
								onClick={() => void deleteFile()}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>

					{/* Split content */}
					<div className="flex min-h-0 flex-1">
						{/* Block editor */}
						<div className={cn("flex min-h-0 flex-1 flex-col", sourceOpen && "border-r")}>
							<div className="flex items-center gap-2 border-b px-4 py-1.5">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="sm" variant="ghost">
											<Plus className="h-3.5 w-3.5" /> Add Block
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start">
										{rootChildTypes.map((type) => (
											<DropdownMenuItem key={type} onClick={() => handleAddRoot(type)}>
												{type}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
								<Badge variant="outline">{allBlockIds(blocks).length} IDs</Badge>
							</div>
							<ScrollArea className="flex-1">
								<DndContext
									sensors={sensors}
									collisionDetection={closestCenter}
									onDragEnd={handleDragEnd}
								>
									<DropContainer id="container:root">
										<SortableContext
											items={blocks.map((b) => b.uiId)}
											strategy={verticalListSortingStrategy}
										>
											<div className="space-y-0.5 p-3">
												{blocks.length ? (
													blocks.map((block) => (
														<StudioEditorBlock
															key={block.uiId}
															block={block}
															onUpdate={(id, next) =>
																setBlocks((prev) => updateBlock(prev, id, next))
															}
															onDelete={(id) => setBlocks((prev) => removeBlock(prev, id))}
															onAddChild={handleAddChild}
															onFocus={setFocusedBlockId}
															focusedBlockId={focusedBlockId}
														/>
													))
												) : (
													<div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
														No blocks yet. Click "Add Block" to start.
													</div>
												)}
											</div>
										</SortableContext>
									</DropContainer>
								</DndContext>
							</ScrollArea>
						</div>

						{/* Source panel */}
						{sourceOpen ? (
							<div className="flex w-[45%] min-w-[300px] flex-col">
								<div className="flex items-center justify-between border-b px-3 py-1.5">
									<span className="text-xs font-medium text-muted-foreground">Source (MDX)</span>
									<Button size="sm" variant="ghost" onClick={() => void applyRawToVisual()}>
										Apply to Visual
									</Button>
								</div>
								<textarea
									className="flex-1 resize-none border-0 bg-transparent p-3 font-[var(--font-mono)] text-xs leading-relaxed text-foreground outline-none"
									value={rawSource}
									onChange={(event) => setRawSource(event.target.value)}
								/>
							</div>
						) : null}
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="border-t">
				<div className="flex items-center justify-between px-4 py-1.5">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
						<span>{message ?? "Ready"}</span>
						{parseError ? (
							<span className="flex items-center gap-1 text-destructive">
								<AlertTriangle className="h-3 w-3" /> {parseError}
							</span>
						) : null}
					</div>
					<button
						type="button"
						className="flex items-center gap-2 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
						onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
					>
						<span>{blocks.length} blocks</span>
						<span className={cn(diagnostics.length > 0 && "text-destructive")}>
							{diagnostics.length} diagnostics
						</span>
						{diagnosticsOpen ? (
							<ChevronDown className="h-3 w-3" />
						) : (
							<ChevronRight className="h-3 w-3" />
						)}
					</button>
				</div>
				{diagnosticsOpen ? (
					<div className="border-t">
						<ScrollArea className="h-32 px-2 py-1">
							<div className="space-y-0.5">
								{diagnostics.length === 0 ? (
									<div className="px-2 py-1 text-xs text-muted-foreground">
										No validation diagnostics.
									</div>
								) : (
									diagnostics.map((diagnostic, index) => (
										<button
											type="button"
											key={`${diagnostic.message}-${index}`}
											className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-accent"
											onClick={() => {
												if (!diagnostic.blockId) {
													return;
												}
												const targetUiId = blockIdToUiId.get(diagnostic.blockId);
												if (targetUiId) {
													setFocusedBlockId(targetUiId);
												}
											}}
										>
											<Badge
												variant={
													diagnostic.severity === "error"
														? "destructive"
														: diagnostic.severity === "warning"
															? "secondary"
															: "outline"
												}
											>
												{diagnostic.severity}
											</Badge>
											<span className="flex-1">{diagnostic.message}</span>
											{diagnostic.blockId ? (
												<span className="font-[var(--font-mono)] text-[10px] text-muted-foreground">
													#{diagnostic.blockId}
												</span>
											) : null}
										</button>
									))
								)}
							</div>
						</ScrollArea>
					</div>
				) : null}
			</footer>
		</div>
	);
}
