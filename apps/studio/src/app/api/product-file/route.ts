import {
	createProductFile,
	deleteProductFile,
	readProductFile,
	renameProductFile,
	writeProductFile,
} from "@/lib/product-files";
import { type NextRequest, NextResponse } from "next/server";

function badRequest(message: string): NextResponse {
	return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
	const path = request.nextUrl.searchParams.get("path");
	if (!path) {
		return badRequest("Missing path query parameter");
	}

	try {
		const file = await readProductFile(path);
		return NextResponse.json(file);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to read file";
		const status = message.includes("ENOENT") ? 404 : 400;
		return NextResponse.json({ error: message }, { status });
	}
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as { path?: string; content?: string };
	if (!body.path || typeof body.content !== "string") {
		return badRequest("Body must include path and content");
	}

	try {
		const result = await writeProductFile(body.path, body.content);
		return NextResponse.json({ ok: true, path: result.path });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to write file";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as {
		path?: string;
		initialContent?: string;
		metadata?: { title?: string; version?: string; description?: string };
	};

	if (!body.path) {
		return badRequest("Body must include path");
	}

	try {
		const result = await createProductFile(body.path, body.initialContent, body.metadata);
		return NextResponse.json({ ok: true, path: result.path });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to create file";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as { fromPath?: string; toPath?: string };
	if (!body.fromPath || !body.toPath) {
		return badRequest("Body must include fromPath and toPath");
	}

	try {
		const result = await renameProductFile(body.fromPath, body.toPath);
		return NextResponse.json({ ok: true, path: result.path });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to rename file";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
	const path = request.nextUrl.searchParams.get("path");
	if (!path) {
		return badRequest("Missing path query parameter");
	}

	try {
		await deleteProductFile(path);
		return NextResponse.json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to delete file";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
