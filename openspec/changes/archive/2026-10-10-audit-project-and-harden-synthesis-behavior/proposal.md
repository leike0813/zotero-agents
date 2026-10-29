# Proposal

## Why

The Synthesis baseline passes its existing suites, yet malformed JSON RPC envelopes are reported as service outages or internal failures instead of invalid responses. A project-wide defect audit and a source-linked Synthesis behavior inventory are needed to expose gaps that operation counts and schema checks alone cannot establish.

## What Changes

- Audit the current project, prioritizing Synthesis TypeScript/Rust contracts, reverse Host calls, domain behavior, persistence and lifecycle boundaries; reproduce and fix confirmed defects in their owning modules.
- Validate RPC response envelopes before interpreting success or service errors, preserving existing valid error mappings and public signatures.
- Reconcile all Synthesis public operations and applicable behavioral scenarios with executable assertions, and extend existing unit, contract integration and System E2E tests for missing evidence.
- Share the native suite inventory between suite inclusion and ordinary-shard exclusion, and correct runtime documentation drift.
- Execute full Node/Rust validation and isolated Linux Zotero 7.0.32, 9.0.6 and 10.0.2 System E2E acceptance; retain separate unexecuted Windows/macOS status.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-native-production-routing`: distinguish malformed RPC envelopes from valid native error responses and transport outages.
- `synthesis-cross-language-sidecar-contract`: preserve JSON keys/numbers, expose Index continuations, retain library scope and reject in-flight snapshot drift.
- `acp-chat-session-management`: settle pending permissions when the backend exits while preserving final buffered messages.
- `skillrunner-local-runtime-bootstrap`: preserve previous installs through failed replacement and honor outcome-specific diagnostics retention.
- `synthesis-workbench-surface-refresh`: keep late responses from another library from replacing current content or advancing its request watermark.

## Impact

The shared RPC client and its consumers, Synthesis domain tests/corpora, native test selection, existing System E2E catalog and CI validation are in scope. Confirmed audit defects outside Synthesis are included with their own regression evidence. Index requests gain optional partition cursors; the existing serde_json dependency enables precise float parsing. No dependency, protocol version or database migration is added. Existing staged help-document changes are preserved; publication, commits and change archival are excluded.
