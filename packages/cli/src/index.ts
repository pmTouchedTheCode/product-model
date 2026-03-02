import { defineCommand, runMain } from "citty";
import { buildCommand } from "./commands/build.js";
import { studioCommand } from "./commands/studio.js";
import { validateCommand } from "./commands/validate.js";

const main = defineCommand({
	meta: {
		name: "pm",
		version: "0.1.0",
		description: "Product Model CLI — validate and build .product.mdx files",
	},
	subCommands: {
		validate: validateCommand,
		build: buildCommand,
		studio: studioCommand,
	},
});

runMain(main);
