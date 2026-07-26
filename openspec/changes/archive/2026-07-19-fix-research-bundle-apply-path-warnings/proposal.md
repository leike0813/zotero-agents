## Why

Research Bundle apply currently forwards URL-shaped Windows image paths such as `E:/...` to Zotero `IOUtils`, which can reject them before the existing optional-image warning policy runs. Successful apply operations also do not expose their materialization warning summary in runtime logs, leaving operators to discover incomplete optional assets only inside the Product.

## What Changes

- Normalize workflow file inputs at the shared platform, Host API, and Product local-file ingress boundaries.
- Make file existence probing a total boolean operation while preserving strict failures for required reads, writes, and accepted Product asset copies.
- Convert Markdown local-image resolution failures into the existing `markdown_image_missing` warning without failing the parent export.
- Add a bounded, structured `applyDiagnostics` hook result contract and emit it on successful apply logs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-platform-services`: Native path normalization accepts URL-shaped local paths and shared file boundaries consistently apply it.
- `workflow-execution-seams`: Successful apply hooks can return bounded warning diagnostics that the apply seam records without changing success semantics.
- `research-bundle-readable-product`: Unreadable or unresolvable optional Markdown images remain warnings, including resolver failures, and warning summaries are observable during apply.

## Impact

- Shared path normalization and Host file operations.
- Workflow Product local-file source ingestion.
- Literature Workbench Markdown image rewriting and Research Bundle apply hook output.
- Workflow apply result types and runtime success logging.
- Existing targeted Node and Zotero parity tests; no dependency, Host API version, Product format, or Workspace UI change.
