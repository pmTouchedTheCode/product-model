# Contributing to Product Model

## Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 9+

## Setup

```bash
git clone <repo-url>
cd product-model
pnpm install
pnpm build
```

## Development Workflow

```bash
# Run all checks
pnpm build        # Build all packages
pnpm typecheck    # TypeScript type checking
pnpm lint         # Biome lint + format check
pnpm test         # Run tests

# Fix formatting
pnpm lint:fix
pnpm format
```

## Project Structure

```
packages/
  core/    @product-model/core — schemas, parser, validator
  cli/     @product-model/cli  — CLI entry point
models/    .product.mdx files (dogfood + examples)
```

## Pull Request Guidelines

1. Branch from `main`
2. Include tests for new functionality
3. Ensure all checks pass: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
4. Fill out the PR template
5. Add a changeset if your change affects published packages: `pnpm changeset`

## Code Style

Enforced by [Biome](https://biomejs.dev/). Tabs for indentation, double quotes, semicolons.
