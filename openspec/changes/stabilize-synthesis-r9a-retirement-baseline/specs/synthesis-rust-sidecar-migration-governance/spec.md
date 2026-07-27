## ADDED Requirements

### Requirement: R9b retirement SHALL require a durable R9a baseline

Physical retirement of plugin legacy or Node sidecar code SHALL NOT begin until
the R9a capability, corpus partition, dispatcher, ready-roster, critical-smoke,
boundary, lifecycle, recovery, TypeScript, Rust, Stage-1, and production-build
gates pass without reading active or archived OpenSpec change artifacts.

#### Scenario: R9a code is implemented but an archival-safe gate fails
- **WHEN** a required checker or test cannot reproduce its result from current-state contracts and source
- **THEN** the retained implementations remain in place
- **AND** neither dependent R9b deletion change is apply-ready in practice

### Requirement: Pre-deletion candidate evidence SHALL be recorded separately

Before destructive R9b deletion begins, the project SHALL record one
five-platform native candidate result and the agreed representative
clean-machine results for the same source identity. The receipt MUST bind the
source commit, Rust toolchain, Cargo lock identity, five target fingerprints,
per-target compressed sizes, workflow identity, and outcomes. Candidate
evidence MUST NOT be represented as signing, final XPI, offline-install,
upgrade, release, or complete Stage-1 acceptance.

#### Scenario: Candidate matrix passes
- **WHEN** all five native targets and representative clean-machine checks pass for one source identity
- **THEN** the first destructive R9b change may begin
- **AND** final package and real-machine gates remain pending

#### Scenario: Candidate evidence is absent or mixed
- **WHEN** a target is missing, source identities differ, or a result is only inferred from local tests
- **THEN** destructive retirement remains blocked

### Requirement: R9 current-state documentation SHALL match executable ownership

The Rust migration plan and active Synthesis architecture documents SHALL state
the actual production owner, route readiness, mutation state, retained
retirement inventory, dependent R9b changes, and pending external evidence.
They MUST NOT describe completed native routing as pending or report unexecuted
remote evidence as passing.

#### Scenario: R9a baseline is reviewed
- **WHEN** code, contract, test, and documentation inventories are compared
- **THEN** ownership and readiness statements agree with the executable gates
- **AND** every retained legacy/Node area is assigned to one downstream deletion change

