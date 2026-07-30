## MODIFIED Requirements

### Requirement: Formal runtime inventory SHALL be native-only

Runtime source inputs, packages, freshness checks, candidate workflows, and XPI
checks SHALL contain one native Rust executable plus manifest v3, provenance,
SBOM/license inventory, and product license for each supported target. They
MUST exclude Node/npm executables or archives, JavaScript service/package
trees, Node manifests or entrypoints, D3 runtime files, undeclared binaries,
and implementation selectors. Per-target compressed runtime size MUST remain
at or below 15 MiB, the five-target total at or below 75 MiB, and final
universal XPI size at or below 100 MiB.

#### Scenario: Native XPI inventory is inspected
- **WHEN** a formal XPI candidate is checked
- **THEN** each supported target contains exactly the required signed/verified native runtime inventory for that acceptance stage
- **AND** any Node, npm, JavaScript service, D3 runtime, stale, missing, duplicate, undeclared, fingerprint-mismatched, or oversized artifact fails the gate

#### Scenario: Repository delivery graph is inspected
- **WHEN** workspaces, package scripts, workflow paths, runtime packaging inputs, runtime installation, and release inventory are checked
- **THEN** all Synthesis runtime delivery paths resolve to manifest-v3 Rust bundles and the one fixed `current` installation
- **AND** no Node delivery, runtime pointer, candidate resolver, or rollback path remains

## ADDED Requirements

### Requirement: Native-only inventory gates SHALL survive implementation deletion

Removing obsolete Node/D3 packaging code SHALL NOT remove the negative
inventory guarantees. The surviving checks SHALL reject forbidden runtime
classes and identities directly and MUST NOT require a deprecated Node manifest,
workspace, or generated comparison artifact to run.

#### Scenario: Deleted Node workspace is absent
- **WHEN** package and XPI checks run after `apps/synthesis-service` is removed
- **THEN** they complete from current Rust manifests, provenance, licenses, source fingerprints, and package contents
- **AND** absence of the old workspace is treated as the required state rather than a missing fixture
