## 1. Lock Workflow Host API v7 behavior with tests

- [x] 1.1 Extend `test/core/90-workflow-host-api-file-picker.test.ts` with save-mode success, cancellation, suggested filename, filter, initial-directory, and replacement-return coverage before implementing `file.pickSaveFile`.
- [x] 1.2 Add focused ZIP service tests for streamed file/text/byte round-trip, binary reads, entry enumeration, duplicate and unsafe path rejection, closed-manifest support, SHA-256/size calculation, scoped temporary cleanup, and atomic target preservation on failure.
- [x] 1.3 Extend `test/core/12-handlers.test.ts` with complete portable item JSON sanitization/restoration, stored-file plus companion-file import, parent cleanup, and URL attachment creation with deduplication disabled.
- [x] 1.4 Extend `test/core/102-zotero-host-broker-capability-api.test.ts` with real-collection/current-library projection and non-collection exclusion, then update stable Host API version assertions and debug/loader probes from v6 to v7.

## 2. Implement generic Host API primitives

- [x] 2.1 Update `src/workflows/types.ts` and `src/workflows/hostApi.ts` to Host API v7 and implement `file.pickSaveFile` through Zotero/toolkit save mode without Node.js APIs.
- [x] 2.2 Refactor the existing ZIP path validation/readers and duplicate store-only writers into a core archive SSOT that implements `archive.writeZipAtomic` and `archive.withExtractedZip`, streams file-backed entries and SHA-256, and retains compatibility wrappers for existing provider/content callers.
- [x] 2.3 Extend `src/handlers/index.ts` and the Host API item/attachment facades with `exportPortableJson`, `createFromJson`, item removal, stored-file plus safe companion import, and caller-controlled URL deduplication.
- [x] 2.4 Extend the broker current-view DTO and resolver to expose `currentCollection` only for a real collection row and keep current library resolution for collection-free views.
- [x] 2.5 Synchronize package runtime version guards, capability summaries, debug probes, tests, and `doc/components/zotero-host-capability-broker-ssot.md` with the final Host API v7 contract.

## 3. Lock portable workflow behavior with tests

- [x] 3.1 Add a dedicated `test/workflow-literature-workbench-package/*literature-bundle*.test.ts` suite that first verifies both manifests load as non-core pass-through workflows, export accepts parent-only multi-selection, and import runs with `trigger.requiresSelection: false`.
- [x] 3.2 Add export tests for complete parent JSON, creators, tags, bundle-local related edges, stored and linked files, URL attachments, skipped missing files, closed file declarations, and structured warning codes without asserting full prose.
- [x] 3.3 Add one representative note round-trip containing an ordinary note, all three literature-analysis notes, a conversation note, an ordinary embedded image, and v2 payload PNGs; assert semantic payload equality and new attachment-key rewrites rather than source ids or HTML formatting.
- [x] 3.4 Add Markdown sidecar tests for relative, absolute, and `file:` local images, percent encoding, query/fragment handling, repeated-image deduplication, missing-image warnings, HTTP(S)/data URI preservation, and imported same-storage relative paths.
- [x] 3.5 Add table-driven invalid-bundle tests for corrupt ZIPs, unsafe or duplicate paths, wrong kind/version, duplicate logical ids, unresolved refs, undeclared/missing files, and size/hash mismatch; assert zero Zotero mutation.
- [x] 3.6 Add import tests for current collection versus library root, URL no-dedupe, repeated bundle import producing separate graphs, per-parent cleanup/continuation, and best-effort package-local relation restoration.

## 4. Implement the literature bundle workflows

- [x] 4.1 Add `workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs` as the SSOT for schema-v1 DTO normalization, closed-manifest validation, logical-id/reference mapping, warning codes, note HTML portability, Markdown image collection, and stable result shapes; reuse existing package codecs and path helpers.
- [x] 4.2 Add `export-literature-bundle/workflow.json`, `hooks/applyResult.mjs`, and `README.md`; traverse each selected parent's direct attachments, every child note, and every note-child attachment, then write the integrity-indexed archive through Host API v7.
- [x] 4.3 Add `import-literature-bundle/workflow.json`, `hooks/applyResult.mjs`, and `README.md`; validate before mutation, materialize new parent graphs in the current target, rewrite note keys, clean failed parents, and restore successful bundle-local relations.
- [x] 4.4 Register both workflows and every shipped hook/shared file in `workflow-package.json` and `workflows_builtin/manifest.json`, and add labels to the ten existing non-default locale JSON files while keeping manifest English labels as fallback.

## 5. Verify integration and documentation

- [x] 5.1 Run the focused core and literature-workbench workflow tests, then fix failures without weakening stable behavior assertions.
- [x] 5.2 Run project typecheck, lint, workflow/package schema validation, built-in content manifest/render checks, and the smallest Zotero mock/runtime gates covering changed handlers and archive services.
- [x] 5.3 Review `src/**` for workflow-specific identities, confirm literature semantics remain package-owned, and confirm no Node.js-only runtime APIs entered plugin execution paths.
- [x] 5.4 Update workflow-facing documentation where built-in workflow inventories are maintained, and record any validation that cannot run with its reason and remaining risk.
