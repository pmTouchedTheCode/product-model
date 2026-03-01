"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	ChevronRight,
	FilePenLine,
	FolderTree,
	GripVertical,
	Loader2,
	Moon,
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
				"rounded-lg border border-dashed border-transparent p-2",
				isOver && "border-primary/60 bg-primary/5",
				className,
			)}
		>
			{children}
		</div>
	);
}

function BlockViewer({
	block,
	depth = 0,
}: { block: EditorBlock; depth?: number }): React.JSX.Element {
	return (
		<Card className={cn("border-border/70", depth > 0 && "ml-4")}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Badge variant="outline">{block.type}</Badge>
						<CardTitle className="text-sm font-semibold">
							{block.name || block.id || "Untitled"}
						</CardTitle>
					</div>
					{block.id ? (
						<span className="font-[var(--font-mono)] text-xs text-muted-foreground">
							#{block.id}
						</span>
					) : null}
				</div>
				{block.description ? <CardDescription>{block.description}</CardDescription> : null}
			</CardHeader>
			<CardContent className="space-y-2 text-sm">
				{block.type === "Definition" && block.fields?.length ? (
					<div className="space-y-1 rounded-md bg-muted/60 p-3">
						{block.fields.map((field) => (
							<div className="flex items-center justify-between gap-3" key={field.name}>
								<span className="font-medium">{field.name}</span>
								<span className="font-[var(--font-mono)] text-xs text-muted-foreground">
									{field.type}
								</span>
							</div>
						))}
					</div>
				) : null}
				{block.type === "Policy" ? (
					<div className="rounded-md bg-muted/60 p-3">
						<div className="text-xs uppercase tracking-wide text-muted-foreground">Rule</div>
						<div>{block.rule}</div>
					</div>
				) : null}
				{block.type === "Constraint" ? (
					<div className="rounded-md bg-muted/60 p-3">
						<div className="text-xs uppercase tracking-wide text-muted-foreground">Condition</div>
						<div>{block.condition}</div>
					</div>
				) : null}
				{block.type === "Link" ? (
					<div className="rounded-md bg-muted/60 p-3 font-[var(--font-mono)] text-xs">
						{block.from} {block.relationship} {block.to}
					</div>
				) : null}
				{block.children?.length
					? block.children.map((child) => (
							<BlockViewer key={child.uiId} block={child} depth={depth + 1} />
						))
					: null}
			</CardContent>
		</Card>
	);
}

function StudioEditorBlock({
	block,
	onUpdate,
	onDelete,
	onAddChild,
	onFocus,
	focused,
}: {
	block: EditorBlock;
	onUpdate: (id: string, next: Partial<EditorBlock>) => void;
	onDelete: (id: string) => void;
	onAddChild: (parentId: string, type: EditorBlock["type"]) => void;
	onFocus: (id: string) => void;
	focused: boolean;
}): React.JSX.Element {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: block.uiId,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const childTypes = useMemo(() => getAllowedChildTypes(block.type), [block.type]);

	return (
		<div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
			<Card className={cn("border-border/70", focused && "ring-2 ring-primary")}>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<Button
								size="icon"
								variant="ghost"
								className="h-7 w-7"
								{...attributes}
								{...listeners}
							>
								<GripVertical className="h-4 w-4" />
							</Button>
							<Badge variant="outline">{block.type}</Badge>
						</div>
						<div className="flex items-center gap-2">
							{canHaveChildren(block.type) ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="sm" variant="secondary">
											<Plus className="h-3.5 w-3.5" /> Add Child
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
							<Button size="sm" variant="ghost" onClick={() => onDelete(block.uiId)}>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-3" onClick={() => onFocus(block.uiId)}>
					{block.type !== "Link" ? (
						<>
							<div className="grid gap-2">
								<Label>ID</Label>
								<Input
									value={block.id ?? ""}
									onChange={(event) => onUpdate(block.uiId, { id: event.target.value })}
								/>
							</div>
							<div className="grid gap-2">
								<Label>Name</Label>
								<Input
									value={block.name ?? ""}
									onChange={(event) => onUpdate(block.uiId, { name: event.target.value })}
								/>
							</div>
						</>
					) : (
						<div className="grid gap-2">
							<Label>Optional Link ID</Label>
							<Input
								value={block.id ?? ""}
								onChange={(event) => onUpdate(block.uiId, { id: event.target.value })}
							/>
						</div>
					)}

					{block.type === "Section" ? (
						<div className="grid gap-2">
							<Label>Status</Label>
							<div className="flex flex-wrap gap-2">
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
							<div className="grid gap-2">
								<Label>Version</Label>
								<Input
									value={block.version ?? "1.0.0"}
									onChange={(event) => onUpdate(block.uiId, { version: event.target.value })}
								/>
							</div>
							<div className="space-y-2 rounded-lg border bg-muted/20 p-3">
								<div className="flex items-center justify-between">
									<Label>Fields</Label>
									<Button
										variant="secondary"
										size="sm"
										onClick={() => {
											const fields = [...(block.fields ?? [])];
											fields.push({ name: "field", type: "string", required: true });
											onUpdate(block.uiId, { fields });
										}}
									>
										<Plus className="h-3.5 w-3.5" /> Field
									</Button>
								</div>
								{(block.fields ?? []).map((field, index) => (
									<div
										className="grid gap-2 rounded-md border bg-background p-2"
										key={`${field.name}-${index}`}
									>
										<div className="grid gap-2 md:grid-cols-2">
											<Input
												value={field.name}
												onChange={(event) => {
													const fields = [...(block.fields ?? [])];
													fields[index] = { ...field, name: event.target.value };
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
										<div className="grid gap-2 md:grid-cols-2">
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
													fields[index] = { ...field, required: !field.required };
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
											<Trash2 className="h-3.5 w-3.5" /> Remove
										</Button>
									</div>
								))}
							</div>
						</>
					) : null}

					{block.type === "Policy" ? (
						<>
							<div className="grid gap-2">
								<Label>Rule</Label>
								<Textarea
									value={block.rule ?? ""}
									onChange={(event) => onUpdate(block.uiId, { rule: event.target.value })}
								/>
							</div>
							<div className="grid gap-2">
								<Label>Enforcement</Label>
								<div className="flex flex-wrap gap-2">
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
						<div className="grid gap-2">
							<Label>Condition</Label>
							<Textarea
								value={block.condition ?? ""}
								onChange={(event) => onUpdate(block.uiId, { condition: event.target.value })}
							/>
						</div>
					) : null}

					{block.type === "Link" ? (
						<>
							<div className="grid gap-2 md:grid-cols-2">
								<div className="grid gap-2">
									<Label>From</Label>
									<Input
										value={block.from ?? ""}
										onChange={(event) => onUpdate(block.uiId, { from: event.target.value })}
									/>
								</div>
								<div className="grid gap-2">
									<Label>To</Label>
									<Input
										value={block.to ?? ""}
										onChange={(event) => onUpdate(block.uiId, { to: event.target.value })}
									/>
								</div>
							</div>
							<div className="grid gap-2">
								<Label>Relationship</Label>
								<div className="flex flex-wrap gap-2">
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

					<div className="grid gap-2">
						<Label>Description / Body</Label>
						<Textarea
							value={block.description ?? ""}
							onChange={(event) => onUpdate(block.uiId, { description: event.target.value })}
						/>
					</div>

					{block.children?.length ? (
						<DropContainer id={`container:${block.uiId}`}>
							<SortableContext
								items={block.children.map((child) => child.uiId)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-2">
									{block.children.map((child) => (
										<StudioEditorBlock
											key={child.uiId}
											block={child}
											onUpdate={onUpdate}
											onDelete={onDelete}
											onAddChild={onAddChild}
											onFocus={onFocus}
											focused={focused && child.id === block.id}
										/>
									))}
								</div>
							</SortableContext>
						</DropContainer>
					) : null}
				</CardContent>
			</Card>
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
	const [activeTab, setActiveTab] = useState("visual");
	const [message, setMessage] = useState<string | null>(null);
	const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
	const [newFilePath, setNewFilePath] = useState("models/new.product.mdx");
	const [renamePath, setRenamePath] = useState("");
	const [showNewDialog, setShowNewDialog] = useState(false);
	const [showRenameDialog, setShowRenameDialog] = useState(false);
	const [themeMounted, setThemeMounted] = useState(false);

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
	): Promise<{ doc: PMDocumentModel | null; diagnostics: ValidationDiagnostic[]; error?: string }> {
		const response = await fetch("/api/validate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				source,
				metadata: nextMeta,
			}),
		});

		const json = (await response.json()) as {
			document?: PMDocumentModel;
			diagnostics?: ValidationDiagnostic[];
			error?: string;
		};

		if (!response.ok || !json.document) {
			return {
				doc: null,
				diagnostics: [],
				error: json.error ?? "Failed to parse/validate",
			};
		}

		return {
			doc: json.document,
			diagnostics: json.diagnostics ?? [],
		};
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
			const sourceToSave =
				activeTab === "visual" ? serializeProductMdx(metadata, blocks) : rawSource;

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
		setActiveTab("visual");
	}

	async function validateCurrent(): Promise<void> {
		const source = activeTab === "visual" ? serializeProductMdx(metadata, blocks) : rawSource;
		const result = await runValidation(source, metadata);
		if (result.doc) {
			setDiagnostics(result.diagnostics);
			setParseError(null);
			if (activeTab === "visual") {
				setBlocks(fromPMDocument(result.doc));
			}
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
			body: JSON.stringify({
				path: newFilePath,
				metadata,
			}),
		});

		const json = (await response.json()) as { ok?: boolean; path?: string; error?: string };
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
		const json = (await response.json()) as { ok?: boolean; path?: string; error?: string };
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
		<div className="grid h-screen grid-rows-[auto_1fr_auto]">
			<header className="border-b bg-background/70 px-4 py-3 backdrop-blur-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-primary/15 p-2 text-primary">
							<FolderTree className="h-5 w-5" />
						</div>
						<div>
							<div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
								Product Studio
							</div>
							<div className="font-[var(--font-mono)] text-xs text-muted-foreground">
								{activePath ?? "No file selected"}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<DiagnosticsBadge diagnostics={diagnostics} />
						<Button
							variant="outline"
							size="icon"
							onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
							aria-label="Toggle theme"
							disabled={!themeMounted}
						>
							{isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
						</Button>
						<Button variant="outline" onClick={() => void validateCurrent()}>
							<RefreshCcw className="h-4 w-4" /> Validate
						</Button>
						<Button onClick={() => void saveFile()} disabled={!activePath || saving}>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
							Save
						</Button>
					</div>
				</div>
			</header>

			<main className="grid min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[280px_1fr_1fr]">
				<Card className="min-h-0 overflow-hidden">
					<CardHeader className="space-y-3 pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base">Files</CardTitle>
							<Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
								<DialogTrigger asChild>
									<Button size="sm" variant="secondary">
										<Plus className="h-3.5 w-3.5" /> New
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
						<Input
							placeholder="Search files"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</CardHeader>
					<CardContent className="min-h-0 pb-4">
						<ScrollArea className="h-[calc(100vh-250px)] pr-2">
							<div className="space-y-1">
								{filteredFiles.map((file) => (
									<Button
										key={file.path}
										variant={activePath === file.path ? "default" : "ghost"}
										className="w-full justify-start gap-2"
										onClick={() => void openFile(file.path)}
									>
										<FilePenLine className="h-4 w-4" />
										<span className="truncate text-left">{file.path}</span>
									</Button>
								))}
							</div>
						</ScrollArea>
					</CardContent>
				</Card>

				<Card className="min-h-0 overflow-hidden">
					<CardHeader className="space-y-3 pb-2">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<CardTitle className="text-base">Editor</CardTitle>
							<div className="flex items-center gap-2">
								<Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
									<DialogTrigger asChild>
										<Button size="sm" variant="outline" disabled={!activePath}>
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
									variant="destructive"
									disabled={!activePath}
									onClick={() => void deleteFile()}
								>
									<Trash2 className="h-3.5 w-3.5" /> Delete
								</Button>
							</div>
						</div>
						<div className="grid gap-2 sm:grid-cols-2">
							<div className="grid gap-1">
								<Label>Title</Label>
								<Input
									value={metadata.title}
									onChange={(event) =>
										setMetadata((prev) => ({ ...prev, title: event.target.value }))
									}
								/>
							</div>
							<div className="grid gap-1">
								<Label>Version</Label>
								<Input
									value={metadata.version}
									onChange={(event) =>
										setMetadata((prev) => ({ ...prev, version: event.target.value }))
									}
								/>
							</div>
						</div>
						<div className="grid gap-1">
							<Label>Description</Label>
							<Textarea
								value={metadata.description ?? ""}
								onChange={(event) =>
									setMetadata((prev) => ({ ...prev, description: event.target.value }))
								}
							/>
						</div>
					</CardHeader>
					<CardContent className="min-h-0">
						<Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
							<TabsList>
								<TabsTrigger value="visual">Visual</TabsTrigger>
								<TabsTrigger value="raw">Raw MDX</TabsTrigger>
							</TabsList>
							<TabsContent value="visual" className="h-[calc(100vh-380px)]">
								<div className="mb-2 flex items-center gap-2">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button size="sm" variant="secondary">
												<Plus className="h-3.5 w-3.5" /> Add Root Block
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
								<ScrollArea className="h-[calc(100%-36px)] pr-2">
									<DndContext
										sensors={sensors}
										collisionDetection={closestCenter}
										onDragEnd={handleDragEnd}
									>
										<DropContainer id="container:root">
											<SortableContext
												items={blocks.map((block) => block.uiId)}
												strategy={verticalListSortingStrategy}
											>
												<div className="space-y-2">
													{blocks.map((block) => (
														<StudioEditorBlock
															key={block.uiId}
															block={block}
															onUpdate={(id, next) =>
																setBlocks((prev) => updateBlock(prev, id, next))
															}
															onDelete={(id) => setBlocks((prev) => removeBlock(prev, id))}
															onAddChild={handleAddChild}
															onFocus={setFocusedBlockId}
															focused={focusedBlockId === block.uiId}
														/>
													))}
												</div>
											</SortableContext>
										</DropContainer>
									</DndContext>
								</ScrollArea>
							</TabsContent>
							<TabsContent value="raw" className="h-[calc(100vh-380px)]">
								<div className="mb-2 flex items-center justify-between gap-2">
									<Button size="sm" variant="secondary" onClick={() => void applyRawToVisual()}>
										Apply to Visual
									</Button>
									<Badge variant="outline">Canonical formatting applied from Visual saves</Badge>
								</div>
								<Textarea
									className="h-[calc(100%-38px)] font-[var(--font-mono)] text-xs"
									value={rawSource}
									onChange={(event) => setRawSource(event.target.value)}
								/>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>

				<Card className="min-h-0 overflow-hidden">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Viewer</CardTitle>
						<CardDescription>
							Mintlify-inspired structured preview rendered from parsed AST
						</CardDescription>
					</CardHeader>
					<CardContent className="min-h-0">
						<ScrollArea className="h-[calc(100vh-250px)] pr-2">
							<div className="prose-like space-y-3">
								{blocks.length ? (
									blocks.map((block) => <BlockViewer key={block.uiId} block={block} />)
								) : (
									<div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
										No blocks to preview.
									</div>
								)}
							</div>
						</ScrollArea>
					</CardContent>
				</Card>
			</main>

			<footer className="border-t bg-background/80 p-3">
				<div className="grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
					<div className="flex min-h-9 items-center gap-2 text-sm text-muted-foreground">
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
						<span>{message ?? "Ready"}</span>
						{parseError ? (
							<span className="inline-flex items-center gap-1 text-destructive">
								<AlertTriangle className="h-4 w-4" /> {parseError}
							</span>
						) : null}
					</div>
					<div className="flex items-center gap-2">
						<Badge variant="outline">{blocks.length} root blocks</Badge>
						<Badge variant="secondary">{diagnostics.length} diagnostics</Badge>
					</div>
				</div>
				<Separator className="my-2" />
				<ScrollArea className="h-24">
					<div className="space-y-1">
						{diagnostics.length === 0 ? (
							<div className="text-sm text-muted-foreground">No validation diagnostics.</div>
						) : (
							diagnostics.map((diagnostic, index) => (
								<Button
									key={`${diagnostic.message}-${index}`}
									variant="ghost"
									className="h-auto w-full justify-start gap-2 py-2 text-left"
									onClick={() => {
										if (!diagnostic.blockId) {
											return;
										}
										const targetUiId = blockIdToUiId.get(diagnostic.blockId);
										if (targetUiId) {
											setFocusedBlockId(targetUiId);
											setActiveTab("visual");
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
									<div className="flex flex-col">
										<span>{diagnostic.message}</span>
										{diagnostic.blockId ? (
											<span className="font-[var(--font-mono)] text-xs text-muted-foreground">
												#{diagnostic.blockId}
											</span>
										) : null}
									</div>
								</Button>
							))
						)}
					</div>
				</ScrollArea>
			</footer>
		</div>
	);
}
