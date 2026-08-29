## 1. Repair Current Parity Evidence

- [x] 1.1 Extend existing parity-policy tests for Rust-private schema markers and stable mismatch diagnostics
- [x] 1.2 Normalize the private redirect-graph marker and rerun all application parity gates

## 2. Separate Evidence Contracts and Identities

- [x] 2.1 Add strict prebuild-result v4, verification-result v2, and release-set v2 contracts
- [x] 2.2 Split governed pipeline revisions and close verification identity over every oracle/checker input
- [x] 2.3 Replace operational v3 admission with v4 build validation and v2 release joining

## 3. Deepen Workflow Orchestration

- [x] 3.1 Move immutable-set publication and v4 rendering from YAML/JQ into a tested publisher
- [x] 3.2 Remove verification admission from prebuild and emit v2 only from successful three-host verification
- [x] 3.3 Resolve and revalidate trusted verification during release preparation and materialization
- [x] 3.4 Fetch exact immutable commits and preserve append-only branch progress under concurrent publishers

## 4. Add the Development Prebuild Seam

- [x] 4.1 Add a stable dispatch/resume/watch/download/sync command with structured output and help
- [x] 4.2 Permit unrelated dirty paths, reject overlapping bundle changes, and preserve atomic rollback
- [x] 4.3 Cover the command, evidence join, recovery, and branch-advance cases through public interfaces

## 5. Current-State Guidance and Verification

- [x] 5.1 Update the prebuild and release Skills with script-assisted current-state contracts
- [x] 5.2 Update packaging and R9a dependency documentation without duplicating the new specification
- [x] 5.3 Run focused tests, parity/contract/license gates, Rust gates, lint/format checks, and strict OpenSpec validation
