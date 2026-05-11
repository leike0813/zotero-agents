# Tasks

## 1. OpenSpec Contracts

- [x] Add proposal, design, tasks, and delta spec for `synthesis-layer-foundation`.
- [x] Validate the change status with OpenSpec.

## 2. Foundation Tests

- [x] Add tests for canonical JSON envelope validation and unknown-field warnings.
- [x] Add tests for stable JSON and Markdown SHA-256 hashing.
- [x] Add tests for note shard title format and parser behavior.
- [x] Add tests for note shard HTML payload extraction and codec roundtrip.
- [x] Add tests for manifest sorting and manifest hash excluding itself.
- [x] Add tests for local library write lock serialization.
- [x] Add tests for compare-and-swap success and mismatch decisions.

## 3. Foundation Implementation

- [x] Add `src/modules/synthesis/` foundation modules.
- [x] Implement schema/envelope helpers with Ajv-backed validation.
- [x] Implement stable canonicalization and SHA-256 helpers.
- [x] Implement storage path and status planning helpers.
- [x] Implement note shard codec and manifest helpers.
- [x] Implement library write lock and compare-and-swap helpers.
- [x] Implement foundation preference defaults.

## 4. Verification

- [x] Run targeted core tests for Synthesis foundation.
- [x] Run `npx tsc --noEmit`.
