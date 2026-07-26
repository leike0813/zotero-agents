## 1. Release And Agent Contracts

- [x] 1.1 Define and validate `host-bridge.release-set.v1` and `host-bridge.release-receipt.v1` schemas with deterministic identity fields.
- [x] 1.2 Define `host-bridge.agent-surface.v1` from the canonical command catalog, including risk, approval, typed handles, retryability, state change, and recovery actions.
- [x] 1.3 Materialize the exact CLI version, build fingerprint, command catalog checksum, binary aggregate, and seven-platform checksums into all three surface manifests.

## 2. CLI And Workflow Control

- [x] 2.1 Add offline `surface identity`, `surface describe`, and `surface search` CLI commands and verify packaged-binary identity against generated descriptors.
- [x] 2.2 Standardize CLI error envelopes with retry, state-change, handle-consumption, and safe-next-action fields.
- [x] 2.3 Add structured workflow `executionModes` for Host-owned and agent-owned routing.
- [x] 2.4 Preflight every agent apply-back bundle before approval or handle consumption and persist queryable per-request apply receipts.

## 3. Semantic Surface Ownership

- [x] 3.1 Keep CLI wrapper guidance limited to connection, identity, command/output/error contracts, and control invariants.
- [x] 3.2 Add bounded intent-to-command-to-evidence recipes and failure recovery to the Zotero Library Agent bundle.
- [x] 3.3 Keep resident indexing, scheduled read-only maintenance, monitoring, and current Host verification in the Zotero Librarian Profile.
- [x] 3.4 Move all Profile guidance, including library maintenance and workflow-agent runner references, under renderer/source ownership and generate complete canonical command references.
- [x] 3.5 Make semantic review merge-base aware and classify Agent Control Contract, Release Set, OpenSpec, semantic-source, release-metadata, and generated-target changes.

## 4. Unified Release Coordination

- [x] 4.1 Add a read-only Host Bridge release planner that distinguishes CLI binary, installer, each public surface, and generated-only changes.
- [x] 4.2 Add one idempotent prepare command for component patch decisions, rendering, release-set materialization, and unified validation.
- [x] 4.3 Replace Host Bridge publication workflows with `release-host-bridge.yml`, pinned build tools/runners, global concurrency, immutable-first publication, remote manifest verification, and complete receipts.
- [x] 4.4 Make recovery resume the same `releaseSetId`, reuse verified immutable targets, and reject different bytes under an existing version.
- [x] 4.5 Align the project release coordinator and Host Bridge project Skills with exact identity, prebuild handoff, receipt completion, and recovery contracts.

## 5. Verification

- [x] 5.1 Add table-driven tests for release classification, exact CLI identity, three-surface manifests, workflow execution ownership, typed handles, errors, apply receipts, and failure recovery.
- [x] 5.2 Verify semantic source ownership and reject canonical commands absent from the Agent Control Contract.
- [x] 5.3 Run focused TypeScript and Rust tests, TypeScript type checking, lint/format checks, schema validation, renderer/check commands, prebuild freshness handoff, Skill validation, and unified Host Bridge surface verification.
- [x] 5.4 Confirm that release preparation leaves one maintainer command and publication leaves one automatic workflow entrypoint.
