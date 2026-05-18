# Design

## Product Registration

Workflow `applyResult` hooks receive a `productStorage` API. Hooks decide whether
their output should appear in the Dashboard product storage area.

The API hides backend differences:

- ACP/local runs register local workspace assets without copying them.
- SkillRunner/bundle-only runs cache bundle entries into a local product asset
  directory and register those cached files.

Registration is idempotent by `requestId + productKey`.

## Product Record

Each product record stores stable metadata: `productId`, `productKey`, `kind`,
`title`, `workflowId`, `workflowLabel`, `backendType`, `requestId`, `runId`,
`storageMode`, timestamps, metadata, and normalized assets.

Each asset stores `assetId`, `label`, `path`, `relativePath`, `sourceKind`,
`localPath`, `entryPath`, content type, and optional diagnostics.

## Dashboard

The Dashboard adds a `Products` tab. The tab shows a product list and a detail
pane. The detail pane renders a file tree and a preview pane.

Preview behavior:

- UTF-8 text is previewed.
- Markdown can be rendered using the dashboard markdown renderer.
- JSON is parsed and pretty printed.
- YAML, TOML, LaTeX, Markdown, and JSON use lightweight syntax classes.
- Oversized or binary/unreadable files show metadata and diagnostics instead of
  crashing the view.

## Manuscript Literature Framing

The manuscript framing apply hook registers Introduction, Related Work, Writing
Plan, Citation Map, and Diagnostics as one product. It does not write Zotero
notes or Synthesis canonical assets.
