## Why

Host Bridge exposes three independently versioned agent-facing surfaces, but version similarity alone cannot prove that they contain the same CLI command surface or binary set. Release preparation, publication recovery, workflow ownership, error recovery, and semantic ownership need one machine-verifiable governance model so maintainers and agents can make safe decisions without reconstructing state from prose.

## What Changes

- Introduce a deterministic `host-bridge.release-set.v1` identity shared by the CLI bundle, Zotero Library Agent bundle, and Zotero Librarian profile, including exact CLI identity and seven-platform binary checksums.
- Replace separate Host Bridge publication paths with one planner, one prepare command, and one two-phase release workflow that publishes immutable targets before advancing mutable pointers.
- Define `host-bridge.agent-surface.v1` as the machine-readable command, risk, approval, typed-handle, retry, state-change, and recovery contract.
- Add offline CLI surface identity, describe, and intent search commands plus structured workflow execution modes and auditable agent apply-back receipts.
- Separate CLI wrapper, bounded Library Agent, and resident Librarian Profile task policy while sharing protocol-level control facts and deterministic generated references.
- Make semantic review merge-base aware and govern Agent Control Contract, Release Set, OpenSpec, semantic-source ownership, and generated-target drift.
- Align project release Skills with the same release-set completion and recovery contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-bridge-release-pipeline`: Govern all three surfaces as one recoverable release set prepared and published through one coordinator.
- `host-bridge-cli-interface`: Expose an offline machine-readable Agent Control Contract and structured safe-recovery errors bound to exact CLI identity.
- `host-bridge-workflow-control`: Declare execution ownership modes and preserve preflight/apply receipts for agent-owned write-back.
- `zotero-library-agent-bundle`: Define bounded task routing and exact release identity for the agent-neutral surface.
- `zotero-librarian-profile`: Preserve resident indexing, scheduling, monitoring, and maintenance ownership while using shared control contracts.

## Impact

- Adds release-set, release-receipt, and agent-surface schemas, descriptors, planners, materializers, and validation paths.
- Changes Rust CLI surface commands and error envelopes, Host Bridge workflow describe/apply-back behavior, and generated semantic references.
- Replaces Host Bridge release workflows and updates publishers, manifests, component version governance, project release Skills, tests, and OpenSpec requirements.
- Keeps the three public repositories and their independent component versions; compatibility is determined by exact identity rather than SemVer inference.
