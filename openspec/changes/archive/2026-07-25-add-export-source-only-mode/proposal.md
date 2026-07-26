## Why

The existing `export-literature-bundle` workflow packages a complete Zotero item graph for round-trip migration. This fidelity is unnecessary when the goal is simply to collect the raw source files of selected literature items — for example, to hand them off to an external tool, archive them outside Zotero, or share them with collaborators who only need the documents.

A separate export path that produces a flat, title-renamed ZIP of source files removes the complexity of the full bundle format while serving this common retrieval use case.

## What Changes

- Add an optional boolean `sourceOnly` parameter (default `false`) to the `export-literature-bundle` workflow manifest.
- When `sourceOnly` is `true`, write a flat ZIP with only an `items/` directory and a `manifest.json`. Each item contributes exactly one file: the Markdown attachment if one exists, otherwise the PDF attachment; no other file types and no Markdown-linked images are included. Each file is renamed after its parent item's title.
- The source-only manifest uses `kind: "zotero-agents-literature-bundle-source-only"` so it is explicitly rejected by `import-literature-bundle`.
- No changes to the standard (non-`sourceOnly`) export path or to `import-literature-bundle`.

## Capabilities

### Modified Capabilities

- `literature-bundle-workflows`: Extend the export workflow with a `sourceOnly` mode; the import contract and the standard bundle format are unchanged.

## Impact

- Built-in content: `workflows_builtin/literature-workbench-package/export-literature-bundle/workflow.json`, `hooks/applyResult.mjs`, `README.md`.
- Package module: `workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs`.
- Spec: `openspec/specs/literature-bundle-workflows/spec.md`.
- Locales: no new locale keys required; the parameter label and description live in `workflow.json` directly.
- No Host API changes; no new dependencies.
