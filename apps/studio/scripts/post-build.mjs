import { cpSync } from "node:fs";

// Next.js standalone in a monorepo mirrors the workspace layout:
// .next/standalone/apps/studio/server.js
// Static assets must be placed relative to that server location.
cpSync(".next/static", ".next/standalone/apps/studio/.next/static", {
	recursive: true,
});
