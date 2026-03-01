import { parse, validate } from "@product-model/core";
import { type NextRequest, NextResponse } from "next/server";

interface ValidateBody {
	source?: string;
	metadata?: {
		title?: string;
		version?: string;
		description?: string;
	};
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as ValidateBody;
	if (typeof body.source !== "string") {
		return NextResponse.json({ error: "Body must include source string" }, { status: 400 });
	}

	const metadata = {
		title: body.metadata?.title?.trim() || "Untitled",
		version: body.metadata?.version?.trim() || "1.0.0",
		description: body.metadata?.description?.trim() || undefined,
	};

	try {
		const document = await parse(body.source, metadata);
		const result = validate(document);
		return NextResponse.json({
			document,
			diagnostics: result.diagnostics,
		});
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to parse/validate" },
			{ status: 400 },
		);
	}
}
