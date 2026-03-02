
<p align="center">
<img alt="Event Flyer - dark" src="https://github.com/user-attachments/assets/0fa16772-a16b-4f20-a224-c9471900c355#gh-light-mode-only">
<img alt="Event Flyer - light" src="https://github.com/user-attachments/assets/6004d66a-3506-4b24-b373-3cacd740843f#gh-dark-mode-only">
</p>

# Product Model

A structured grammar that turns product intent into versionable, validated, machine-readable specs — so what you ship matches what you wrote.

> **"Product Manager should write Product Model, not code."**

## Why

PRDs live in Google Docs. Implementation lives in code. Between them: nothing structured, nothing validated, nothing versioned. Requirements drift, edge cases get lost, and "that's not what I meant" becomes the most expensive sentence in every sprint.

Product Model closes this gap. You author `.product.mdx` files using typed blocks — features, policies, logic, constraints, definitions — and tooling validates them, catches broken references, and outputs a JSON AST that downstream systems can consume.

```mdx
<Feature id="checkout" name="Checkout Flow">
  Checkout flow from cart validation to payment completion.

  <Policy id="max-qty" name="Max Quantity"
    rule="A single cart item cannot exceed 99 units"
    enforcement="must">
    Cap per-item quantity to protect inventory and fraud checks.
    <Logic id="max-qty-logic" name="Quantity Guard">
      Reject updates where requested quantity exceeds 99.
    </Logic>
  </Policy>
</Feature>
```

## Install

```bash
pnpm add @product-model/core
pnpm add -D @product-model/cli
```

## Studio

A visual editor for `.product.mdx` files — browse, edit, and validate without touching raw MDX.

<img width="1470" height="834" alt="Product Studio" src="https://github.com/user-attachments/assets/58cbd5e4-52e4-4e99-9938-66b3e931c081" />

- Auto-discovers all `.product.mdx` files across the workspace
- Inline block editing with drag-and-drop reordering
- Side-by-side raw MDX source panel
- Live validation with diagnostics

```bash
pm studio                    # launch on localhost:3000
pm studio --port 4000        # custom port
pm studio --root ./models    # point to a subdirectory
```

## CLI

```bash
# Validate a single file
pm validate models/checkout.product.mdx --title "Checkout" --version "1.0.0"

# Build JSON AST
pm build models/checkout.product.mdx -o checkout.json --title "Checkout" --version "1.0.0"

# Validate an entire workspace (recursive)
pm validate --workspace-root models --title "Workspace" --version "1.0.0"

# Build workspace JSON (merged document + per-file modules + global ID index)
pm build --workspace-root models -o workspace.json --title "Workspace" --version "1.0.0"
```

Workspace mode scans `**/*.product.mdx` recursively, resolves `Link` references across files, and enforces globally unique block IDs.

## Block Reference

| Block          | Children                                             | Key Fields                        |
| -------------- | ---------------------------------------------------- | --------------------------------- |
| **Feature**    | Section, Definition, Policy, Constraint, Link, Logic | `id`, `name`                      |
| **Section**    | Section, Definition, Policy, Constraint, Link        | `id`, `name`                      |
| **Definition** | —                                                    | `id`, `name`, `version`, `fields` |
| **Policy**     | Logic                                                | `id`, `name`, `rule`              |
| **Constraint** | —                                                    | `id`, `name`, `condition`         |
| **Link**       | —                                                    | `from`, `to`, `relationship`      |
| **Logic**      | —                                                    | `id`, `name`                      |

Every block accepts a plain-text body for human-readable descriptions. `Definition` fields support types: `string`, `number`, `boolean`, `datetime`, `enum`.

## Packages

| Package | Description |
| --- | --- |
| [`@product-model/core`](packages/core) | Parser, validator, schemas, and types |
| [`@product-model/cli`](packages/cli) | CLI for validate and build commands |
| [`@product-model/studio`](apps/studio) | Visual editor for product model files |

## Self-Describing

Product Model describes itself using its own grammar. See [`models/product-model.product.mdx`](models/product-model.product.mdx).

## Roadmap

- Journey modeling across features
- TypeScript type generation from Definitions
- AI-assisted authoring and review
- Runtime policy evaluation
- VS Code extension

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
