# Tasks

## 1. OpenSpec Contracts

- [x] Add proposal, design, tasks, and delta spec for `synthesis-paper-registry`.
- [x] Validate the change status with OpenSpec.

## 2. Registry Tests

- [x] Add tests for registry row construction from paper DTOs.
- [x] Add tests for digest/references/citation-analysis availability.
- [x] Add tests proving artifact hash ignores visible note HTML.
- [x] Add tests for duplicate payload diagnostics.
- [x] Add tests for missing artifact readiness and coverage.

## 3. Registry Implementation

- [x] Add Paper Registry types and projection builder.
- [x] Reuse existing note payload codec for artifact discovery.
- [x] Compute decoded payload hashes with foundation hash helpers.
- [x] Compute readiness, coverage, and diagnostics.
- [x] Add local cache path planning for dedicated `synthesis-layer.db`.

## 4. Verification

- [x] Run targeted core tests for Synthesis Paper Registry.
- [x] Run `npx tsc --noEmit`.
