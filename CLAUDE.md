# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this?

Product Model is a structured MDX-based grammar for bridging product intent (PRDs) and code. PMs author `.product.mdx` files using typed blocks; tooling validates, parses, and builds JSON ASTs.

Core philosophy: **"Product Manager should write Product Model, not code"** (PMPM).

## Commands

```bash
pnpm install                  # Install all dependencies
pnpm build                    # Build all packages (tsup, via Turborepo)
pnpm typecheck                # TypeScript type check across all packages
pnpm lint                     # Biome lint + format check
pnpm lint:fix                 # Auto-fix lint and formatting
pnpm test                     # Run all Vitest tests

# Run a single test file
cd packages/core && npx vitest run tests/schema.test.ts

# Run tests matching a pattern
cd packages/core && npx vitest run -t "BlockIdSchema"
```

Build must succeed before typecheck and test (configured in `turbo.json` via `dependsOn: ["^build"]`).

## Architecture

**Monorepo**: pnpm workspaces + Turborepo. Two packages:

- `packages/core` (`@product-model/core`) — schemas, parser, validator
- `packages/cli` (`@product-model/cli`) — citty-based CLI, depends on core via `workspace:*`

**ESM-only** — unified/remark require ESM. No CJS anywhere.

### Data flow: MDX source → PMDocument

```
.product.mdx source string
  → unified + remark-parse + remark-mdx    (MDX → MDAST)
  → remarkProductModel plugin              (MDAST → ExtractedBlock[])
  → mdxToPmast()                           (ExtractedBlock[] → PMDocument via Zod parse)
  → validate()                             (PMDocument → ValidationResult)
```

1. **`remarkProductModel`** (`parser/remark-product-model.ts`) — custom remark plugin that walks MDAST, finds `mdxJsxFlowElement` nodes matching block types, extracts attributes and nested children into `ExtractedBlock[]`, attaches to `file.data.extractedBlocks`
2. **`mdxToPmast`** (`parser/mdx-to-pmast.ts`) — transforms extracted blocks into a raw object, handles JSON-encoded `fields` attribute for Definition blocks, then runs `PMDocumentSchema.parse()` for Zod validation
3. **`parse()`** (`parser/index.ts`) — public async API combining steps 1-2. Requires `ParseOptions` with `version` and `title` (document metadata is not in MDX frontmatter; it's passed via options/CLI args)
4. **`validate()`** (`validator/index.ts`) — runs all rules against a PMDocument in all-errors mode (not fail-fast)

### Zod schemas are the single source of truth

All TypeScript types are derived via `z.infer<>` in `types/ast.ts`. Never define standalone interfaces for block types — derive from schemas.

Schema hierarchy: `primitives.ts` → `fields.ts` → `blocks.ts`. Recursive types (`SectionBlock`, `FeatureBlock` children) use `z.lazy()` with explicit interface + double cast — this is the standard Zod workaround for recursive schemas.

### Grammar table

`GRAMMAR_TABLE` in `grammar.ts` is a `Record<BlockType, readonly BlockType[]>` defining allowed parent→child relationships. Only `Feature` is allowed at document root (`ROOT_BLOCK_TYPES`). `Policy` may contain nested `Logic` blocks, while leaf blocks (Definition, Constraint, Link, Logic) have no children arrays.

### Validation rules

Four built-in rules in `validator/rules/`:
- `grammar-rules` — root block types + parent-child conformance to GRAMMAR_TABLE
- `id-uniqueness` — no duplicate block IDs across the document
- `version-check` — SemVer format on document and Definition versions
- `link-integrity` — Link `from`/`to` targets must reference existing block IDs

Each rule is `(document: PMDocument) => ValidationDiagnostic[]`. Add new rules to the `RULES` array in `validator/index.ts`.

## Block types

Feature, Section, Definition, Policy, Constraint, Link, Logic

## Code style

Enforced by Biome: **tabs** for indentation, **double quotes**, **semicolons**, line width 100.

## Changesets

Use `pnpm changeset` when changes affect published packages.
