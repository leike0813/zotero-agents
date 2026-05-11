# Tasks

## 1. OpenSpec Contracts

- [x] Add proposal, design, tasks, and delta spec for `synthesize-topic-workflow`.
- [x] Validate the change status with OpenSpec.

## 2. Workflow Contract Tests

- [x] Add tests for valid topic synthesis result bundle validation.
- [x] Add tests rejecting unsupported synthesis kinds.
- [x] Add tests rejecting bundles with direct write instructions.
- [x] Add tests for apply decision success.
- [x] Add tests for base hash mismatch conflict decisions.

## 3. Workflow Contract Implementation

- [x] Add result bundle types and validator.
- [x] Add apply decision helper using foundation CAS.
- [x] Add builtin `synthesize-topic` workflow manifest skeleton.
- [x] Add workflow files to builtin manifest.

## 4. Verification

- [x] Run targeted workflow contract tests.
- [x] Run `npx tsc --noEmit`.
