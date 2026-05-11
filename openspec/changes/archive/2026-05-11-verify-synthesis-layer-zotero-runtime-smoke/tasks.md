# Tasks

## 1. OpenSpec Contracts

- [x] Add proposal, design, tasks, and delta spec for runtime smoke verification.
- [x] Validate the change with OpenSpec.

## 2. Smoke Tests

- [x] Add a Zotero-compatible smoke test for canonical apply and mirror creation.
- [x] Add smoke coverage for default workflow host API exposing Synthesis service.
- [x] Add smoke coverage for deleted shard degraded detection.

## 3. Implementation

- [x] Extend mirror adapter contract with optional shard listing.
- [x] Implement Zotero adapter shard listing and decoding.
- [x] Feed listed mirror shards into snapshot sync assessment.

## 4. Verification

- [x] Run targeted node/core smoke tests.
- [x] Run `npx tsc --noEmit`.
- [x] Run `openspec validate verify-synthesis-layer-zotero-runtime-smoke --strict`.
