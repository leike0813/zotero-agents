## Why

Tag Vocabulary protocol validation and index construction remain embedded in the plugin-owned persistence service alongside SQLite records, canonical exports, import compatibility, staged suggestions, and Host effects. This leaves another deterministic Synthesis kernel coupled to the plugin runtime and duplicates its normalization boundary across validation, mutation, import, and projection paths.

## What Changes

- Add a bounded, environment-neutral Tag Vocabulary engine with separate strict validation and index-build contracts.
- Move protocol normalization, entry normalization, deterministic validation, active-tag projection, and search-index construction into `synthesis-engine`.
- Route every canonical Tag mutation and explicit index rebuild through the same engine while keeping synchronous validation inside the existing repository transaction.
- Keep repository records, transactions, canonical manifests and hashes, diagnostics, import parsing and merge policy, staged suggestions, Host Tag effects, progress, and WebDAV autosync in the application layer.
- Preserve TagVocab v1 behavior, warning codes and ordering, public clients, database schema, persisted shapes, and the `108 methods / 1 direct consumer` inventory.
- Add a test-only Node worker canary without activating a production worker or sidecar runtime.

## Capabilities

### New Capabilities

- `synthesis-tag-vocabulary-engine`: Defines strict validation/index DTOs, deterministic TagVocab v1 semantics, bounded execution, checkpoints, result rebuilding, and process-readiness evidence.

### Modified Capabilities

- `synthesis-tag-vocabulary`: Requires canonical validation and rebuildable index computation to route through the configured engine while persistence and mutation ownership remain application-owned.
- `synthesis-persistence-performance`: Bounds Tag Vocabulary engine requests and keeps projection promotion failure-safe.
- `synthesis-invariant-guardrails`: Prevents environment or persistence dependencies from entering the Tag Vocabulary engine.
- `synthesis-layer-doc-system`: Describes the Tag Vocabulary engine/application boundary as current state.

## Impact

- Affects `packages/synthesis-engine`, the Tag Vocabulary application service and composition, focused Core tests, and current-state Synthesis documentation.
- Adds no dependency and does not change Client APIs, service methods, database schema, canonical artifact formats, WebDAV behavior, production topology, or service inventory.
