import { exec, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { defineCommand } from "citty";

function isPortFree(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = createServer();
		server.once("error", () => resolve(false));
		server.once("listening", () => {
			server.close(() => resolve(true));
		});
		server.listen(port, "localhost");
	});
}

function openBrowser(url: string): void {
	const cmd =
		process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
	exec(`${cmd} ${url}`);
}

export const studioCommand = defineCommand({
	meta: {
		name: "studio",
		description: "Launch the Product Model visual editor",
	},
	args: {
		port: {
			type: "string",
			description: "Port to run on",
			default: "3000",
		},
		root: {
			type: "string",
			description: "Project root directory (defaults to current directory)",
		},
	},
	async run({ args }) {
		const projectRoot = resolve(args.root ?? process.cwd());
		const port = Number(args.port);

		const free = await isPortFree(port);
		if (!free) {
			console.error(`Error: Port ${port} is already in use.`);
			console.error(`Try: pm studio --port ${port + 1}`);
			process.exit(1);
		}

		const require = createRequire(import.meta.url);
		let studioDir: string;
		try {
			const studioPkgPath = require.resolve("@product-model/studio/package.json");
			studioDir = dirname(studioPkgPath);
		} catch {
			console.error(
				"Error: @product-model/studio is not installed.\n" +
					"Run: npm install @product-model/studio",
			);
			process.exit(1);
		}

		// Next.js standalone in a monorepo mirrors the workspace layout
		const standaloneDir = join(studioDir, ".next/standalone");
		const serverPath = join(standaloneDir, "apps/studio/server.js");

		console.log("Starting Product Model Studio...");
		console.log(`  Root: ${projectRoot}`);
		console.log(`  URL:  http://localhost:${port}\n`);

		const child = spawn("node", [serverPath], {
			env: {
				...process.env,
				PRODUCT_MODEL_ROOT: projectRoot,
				PORT: String(port),
				HOSTNAME: "localhost",
			},
			stdio: "inherit",
			cwd: join(standaloneDir, "apps/studio"),
		});

		setTimeout(() => openBrowser(`http://localhost:${port}`), 1500);

		for (const signal of ["SIGINT", "SIGTERM"] as const) {
			process.on(signal, () => {
				child.kill(signal);
			});
		}

		child.on("exit", (code) => {
			process.exit(code ?? 0);
		});
	},
});
