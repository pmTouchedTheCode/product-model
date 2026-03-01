import { listProductFiles } from "@/lib/product-files";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
	try {
		const files = await listProductFiles();
		return NextResponse.json({ files });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to list files" },
			{ status: 500 },
		);
	}
}
