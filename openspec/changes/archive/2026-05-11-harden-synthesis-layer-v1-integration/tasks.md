# Tasks

## 1. OpenSpec Contracts

- [x] Add proposal, design, tasks, and delta specs for integration hardening.
- [x] Validate the change status with OpenSpec.

## 2. Integration Tests

- [x] Add tests for successful topic synthesis apply writing canonical assets.
- [x] Add tests for CAS conflict candidates without current overwrite.
- [x] Add tests for mirror shard refresh through a host-owned adapter.
- [x] Add tests that UI snapshot and review input read persisted state.
- [x] Add tests that the workflow hook delegates to hostApi synthesis service.

## 3. Service Implementation

- [x] Add plugin-side Synthesis service and storage helpers.
- [x] Wire topic synthesis apply to canonical writes, conflict candidates, and logs.
- [x] Wire mirror refresh to note shard encoding and adapter upserts.
- [x] Wire snapshot, artifact read, registry/graph projection, and review input reads.
- [x] Refactor builtin `synthesize-topic` applyResult to use hostApi delegation.

## 4. Verification

- [x] Run targeted synthesis integration tests.
- [x] Run `npx tsc --noEmit`.
- [x] Run `openspec validate harden-synthesis-layer-v1-integration --strict`.
