# Product Model

> **"Product Manager should write Product Model, not code."** (PMPM)

## The Problem

Product intent lives in natural language documents — PRDs, Google Docs, Notion pages — while implementation lives in code. There is no structured, versionable, machine-readable layer between them, causing drift, ambiguity, and weak validation every sprint.

## The Solution

Product Model introduces a structured MDX-based grammar where Product Managers author `.product.mdx` files using typed blocks, and tooling validates, parses, and builds a JSON AST from them.

```mdx
<Feature id="checkout" name="Checkout Flow" status="approved" priority="p0">
  <Definition
    id="cart-item"
    name="Cart Item"
    version="1.0.0"
    fields='[{"name":"productId","type":"string","required":true},
             {"name":"quantity","type":"number","required":true}]'
  />
  <Policy
    id="max-qty"
    name="Max Quantity"
    rule="A single cart item cannot exceed 99 units"
    enforcement="must"
  />
</Feature>
```

## Install

```bash
pnpm add @product-model/core
pnpm add -D @product-model/cli
```

## CLI Usage

### Validate a file

```bash
pm validate models/checkout.product.mdx --title "Checkout" --version "1.0.0"
```

### Build JSON AST

```bash
pm build models/checkout.product.mdx -o checkout.json --title "Checkout" --version "1.0.0"
```

### Validate a workspace (recursive multi-file mode)

```bash
pm validate --workspace-root models --title "Product Workspace" --version "1.0.0"
```

Workspace mode scans `**/*.product.mdx` recursively under the workspace root, excluding common
build/vendor directories (`.git`, `node_modules`, `dist`).

### Build workspace JSON output

```bash
pm build --workspace-root models -o workspace.json --title "Product Workspace" --version "1.0.0"
```

Workspace build output includes:

- `modules` (per-file parsed documents)
- `idIndex` (global block ID to source file mapping)
- `mergedDocument` (single combined document view)

### Workspace reference rules

- `Link.from` and `Link.to` use bare block IDs in workspace mode.
- Link targets resolve across all scanned `.product.mdx` files.
- Block IDs must be globally unique across the workspace.

## Block Reference

| Block          | Children                                              | Required Fields                   |
| -------------- | ----------------------------------------------------- | --------------------------------- |
| **Feature**    | Section, Definition, Policy, Constraint, Link, Metric | `id`, `name`, `status`            |
| **Section**    | Section, Definition, Policy, Constraint, Link, Metric | `id`, `name`                      |
| **Definition** | —                                                     | `id`, `name`, `version`, `fields` |
| **Policy**     | —                                                     | `id`, `name`, `rule`              |
| **Constraint** | —                                                     | `id`, `name`, `condition`         |
| **Link**       | —                                                     | `from`, `to`, `relationship`      |
| **Metric**     | —                                                     | `id`, `name`                      |

## Field Types

Fields within a `Definition` block support these types:

- `string` — text values
- `number` — numeric values
- `boolean` — true/false
- `datetime` — ISO 8601 timestamps
- `enum` — one of a defined set of values (requires `enumValues`)

## Self-Describing

Product Model describes itself using its own grammar. See [`models/product-model.product.mdx`](models/product-model.product.mdx).

## Packages

| Package                                | Description                           |
| -------------------------------------- | ------------------------------------- |
| [`@product-model/core`](packages/core) | Parser, validator, schemas, and types |
| [`@product-model/cli`](packages/cli)   | CLI for validate and build commands   |

## Roadmap

- **Metric block** — KPIs and success criteria with targets
- **Journey modeling** — user flow sequences across features
- **Code generation** — generate TypeScript types from Definitions
- **AI-assisted editing** — LLM-powered authoring and review
- **Runtime interpreter** — evaluate policies and constraints at runtime
- **VS Code extension** — syntax highlighting, autocomplete, inline validation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and development workflow.

## License

[MIT](LICENSE)
