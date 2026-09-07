## Why

Managed notes currently have multiple writers and incompatible Reference/Citation payloads across the analysis Skill, workflows and Synthesis. After PR #40's Preact migration, this change can deliver canonical artifacts and their explicit upgrade UI together, avoiding another Dashboard migration.

## What Changes

- **BREAKING**: One Broker-owned reader/writer for custom, conversation-note, digest, references, citation-analysis and literature-score; six named semantic mutations and ordinary-note protection.
- **BREAKING**: One closed Source Reference/Citation contract across producers, persistence, import/export and TS/Rust Synthesis. Preserve explicit opaque source IDs on editing/import; allocate IDs for new extraction. Runtime owns References basis and Citation staleness.
- Add explicit library migration with parent-set verification, durable receipts, deterministic conversion, review acceptance and a permanent Preact Migrations region. Reuse its private converter for user-selected legacy file/bundle import.
- Remove package-local note orchestration, reference aliases/duplicate DTOs and debug-migrate-note-payloads (DEL-12/13/15).
- Update affected adapters, governed guidance, tests and documentation with the same cutover. Navigation and the later mutation-union projection change remain separate.

## Capabilities

### New Capabilities

- `managed-literature-artifacts`: Six Managed Note operations, semantic detail, strict Source Reference/Citation identity and basis contracts.
- `literature-artifact-migration`: Explicit Dashboard-local scan/apply/stop/continue, deterministic conversion and durable history.

### Modified Capabilities

- `literature-digest-artifact-contract`: Canonical artifact schema replaces native/wrapper aliases and independent schema copies.
- `custom-note-import-export`: Semantic Managed Note import/export and ordinary-note protection replace direct content/payload orchestration.
- `literature-bundle-workflows`: Canonical artifact round-trip and confirmed conversion of recognized legacy payloads before materialization.
- `literature-workbench-workflows`: Analysis applies canonical artifacts through a trusted parent-set writer.
- `task-runtime-ui`: Permanent bounded Preact Migrations region and local commands.
- `synthesis-native-reference-canonical-surface`: Complete canonical Source Reference artifacts enter the Application; Citation evidence follows the References basis.

## Impact

Implementation baseline: `52624e6133e053cf307536248682ba3187801c7d` (PR #40 merge). The issue guide sections 9, 10, 12–16 and the approved implementation plan define the complete scope. Changes affect Broker and Workflow projections, literature-analysis submodule, Workbench workflows, TS/Rust Synthesis, SQLite migration records, Dashboard wire/UI, localization, and governed surfaces. No dependency installation or release dispatch is authorized by this change. Upstream pin and affected runtime build evidence remain required before completion; user-owned pre-existing edits are preserved.
