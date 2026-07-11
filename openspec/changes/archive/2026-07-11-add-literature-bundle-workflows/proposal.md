## Why

Literature items and their analysis outputs are currently tied to one Zotero instance: the existing note export/import workflows exchange selected artifacts but do not preserve a parent item, its complete attachment and note graph, or Markdown-linked local images. A portable, validated bundle is needed to move literature and package-managed analysis state between Zotero 7 and Zotero 9 without depending on a backend service.

## What Changes

- Add non-core `export-literature-bundle` and `import-literature-bundle` workflows to `literature-workbench-package`, both using the local `pass-through` provider.
- Define a versioned ZIP bundle that carries parent bibliographic metadata, tags, all child notes, all readable attachments, package-managed embedded payloads, note images, Markdown-linked local images, and relationships among parents included in the same bundle.
- Export through one save-file prompt. Missing local attachment files are skipped with structured warnings recorded in the bundle and workflow result.
- Import through one open-file prompt, reject invalid or unsafe bundles before mutation, and create new items without deduplication or reuse of source Zotero IDs or keys.
- Import into the current Zotero library and, when the current library view is a collection, add new parents to that collection. Source collection membership is not migrated.
- Extend the versioned Workflow Host API with workflow-agnostic save-file, ZIP archive, item import, stored-attachment import, current-collection, and cleanup primitives required by portable local workflows.
- Add focused Host API and workflow round-trip coverage and synchronize the Host API SSOT documentation.

## Capabilities

### New Capabilities

- `literature-bundle-workflows`: Portable literature bundle format, export/import workflow behavior, validation, warnings, item graph restoration, and failure isolation.

### Modified Capabilities

- `literature-workbench-package`: Register, localize, and distribute the two new non-core pass-through workflows as part of the built-in literature package.
- `zotero-host-capability-broker`: Expose the generic Host API v7 operations needed to save, inspect, extract, and materialize portable workflow bundles without Node.js-only APIs.

## Impact

- Built-in content: `workflows_builtin/literature-workbench-package/**` and its package manifest/locales.
- Runtime contracts: `WorkflowHostApi`, item/attachment handlers, current-view DTOs, and safe ZIP services under `src/**`.
- Documentation: `doc/components/zotero-host-capability-broker-ssot.md` and workflow READMEs.
- Tests: Host API picker/archive/handler contracts plus a dedicated literature bundle round-trip suite.
- No new dependency is required; plugin execution must use Zotero/Gecko APIs rather than Node.js filesystem or archive modules.
