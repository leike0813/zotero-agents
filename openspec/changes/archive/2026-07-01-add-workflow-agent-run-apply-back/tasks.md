## 1. OpenSpec and contracts

- [x] 1.1 Add Zotero Agents OpenSpec proposal, design, tasks, and spec deltas.
- [x] 1.2 Define the output-contract toolkit as a Zotero Agents handoff asset.

## 2. Bundled output-contract toolkit asset

- [x] 2.1 Vendor deterministic schema materialization, artifact normalization, output validation, workspace layout, and bundle assembly into a portable Python package/CLI under project assets.
- [x] 2.2 Add handoff bundle coverage proving the toolkit asset is included.
- [x] 2.3 Add a local Python smoke check for the vendored toolkit asset.

## 3. Host Bridge agent-run handoff

- [x] 3.1 Add lightweight agent-run store with TTL and one-shot apply sealing.
- [x] 3.2 Reuse raw workflow request preparation for agent-run context without backend dispatch or scoped Host Bridge credential injection.
- [x] 3.3 Expand handoff response and bundle with agentRunId, prepared request metadata, request context, output contract metadata, toolkit files, and apply-back instructions.

## 4. Host Bridge apply-back

- [x] 4.1 Add apply-back request parsing, route, stable errors, and approval handling.
- [x] 4.2 Add safe bundle directory/zip importer and namespace/result/artifact validation.
- [x] 4.3 Extract and reuse an apply helper so agent-run apply invokes workflow applyResult through the same runtime contract as normal workflow apply.

## 5. CLI and surfaces

- [x] 5.1 Add Rust CLI `workflow agent-apply` parsing and request construction.
- [x] 5.2 Update Host Bridge surface catalog, generated docs, wrapper skill, and Zotero Librarian profile references.

## 6. Verification

- [x] 6.1 Run focused vendored toolkit smoke checks.
- [x] 6.2 Run focused Host Bridge workflow-control/apply tests.
- [x] 6.3 Run Rust CLI tests and Host Bridge surface/doc sync checks.
