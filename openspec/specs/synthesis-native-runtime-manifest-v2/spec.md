## ADDED Requirements

### Requirement: Native runtime manifest v3 SHALL have one strict identity

Every installable Synthesis runtime MUST use
`synthesis-sidecar-runtime-bundle.v3`, identify `rust-native`, one supported
logical target and target triple, one executable, service/protocol identity,
build and source fingerprints, toolchain and lock provenance, canonical
capabilities, creation/expiry policy, and a complete sorted file inventory.
It SHALL not contain a platform-code-signature field.

#### Scenario: An obsolete or ambiguous manifest is supplied
- **WHEN** a manifest uses v1 or v2, contains a Node version, upstream Node
  archive, JavaScript entrypoint, platform-signature field, unknown field,
  unsafe path, duplicate file, unsupported target, mismatched triple, or
  incomplete identity
- **THEN** the complete manifest SHALL be rejected before any declared file is
  read, written, or executed

### Requirement: Native installation SHALL preserve only compatible rollback

The installer SHALL atomically stage and activate verified v2 Rust bundles,
quarantine corrupt v2 immutable versions, and retain at most one compatible v2
previous pointer.

#### Scenario: V2 activates over a legacy v1 installation
- **WHEN** a valid native v2 bundle is installed in a managed root whose active or previous pointer is v1
- **THEN** v2 activation SHALL succeed atomically without making the v1 bundle rollback-eligible
- **AND** legacy version bytes MAY remain only as unreachable diagnostic material

### Requirement: Candidate and production signature policies SHALL be distinct

Unsigned Windows and macOS candidates SHALL be accepted only by explicit
development verification, while synchronization, production installation, and
formal XPI gates SHALL require verified platform signatures.

#### Scenario: Unsigned candidate reaches a formal gate
- **WHEN** an `unsigned-candidate` Windows or macOS bundle is presented to sync, production installation, or XPI verification
- **THEN** the gate SHALL fail closed without a runtime configuration or environment bypass

### Requirement: Native workflow SHALL build reproducibly without publishing

One workflow SHALL build, test, smoke, inventory, and measure the same native
runtime bytes on the five supported targets using the pinned Rust toolchain.

#### Scenario: Development branch source changes
- **WHEN** a relevant source change triggers the workflow
- **THEN** all five candidate jobs SHALL use the exact toolchain declared by the repository and upload run-scoped artifacts
- **AND** the workflow SHALL NOT update a release or fixed-tag asset
