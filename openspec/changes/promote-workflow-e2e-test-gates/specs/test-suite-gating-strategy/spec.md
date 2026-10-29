## MODIFIED Requirements

### Requirement: Real-host compatibility SHALL remain blocking on supported targets

Existing supported real-host compatibility targets SHALL remain blocking. Phase 1 System E2E cells SHALL begin non-blocking and SHALL become blocking only through explicit per-cell configuration after three reviewed clean independent rounds for the exact calibration identity. A missing, invalid, mixed-identity, or stale round MUST NOT authorize Phase 1 promotion. Independently authorized WF cells SHALL follow the required workflow gate policy below without changing Phase 1 identities or promotion records.

#### Scenario: Compatibility matrix

- **WHEN** the compatibility gate runs
- **THEN** existing promoted Zotero 7, 9, and 10 Linux and Windows targets remain blocking
- **AND** unpromoted E2E cells and explicitly informational macOS evidence do not override blocking results

#### Scenario: E2E cell is promoted

- **WHEN** the maintainer has reviewed three qualifying clean manifests and explicitly changes the Phase 1 cell configuration
- **THEN** that cell becomes blocking independently of unrelated cells
- **AND** the evidence remains linked to its calibration identity

#### Scenario: Windows close lifecycle is unresolved

- **WHEN** `CG-02` still crashes, lacks a trustworthy terminal manifest, or has not been classified on the selected Windows target
- **THEN** the affected Windows release E2E cell SHALL NOT be promoted

## ADDED Requirements

### Requirement: Default test entrypoint SHALL execute the complete routine suite

`npm test` SHALL run shared governance checks, native Rust and native integration
tests, all regular Node shards, and the complete real-Zotero layer including
System E2E. It SHALL preserve failure exit codes and SHALL NOT invoke live model
capture. Explicit Node-only and domain commands SHALL remain available.

#### Scenario: Complete local test invocation

- **WHEN** a maintainer invokes `npm test`
- **THEN** all routine layers execute through their existing authoritative runners
- **AND** any failed prerequisite or test stage fails the command

#### Scenario: Caller has live-capture environment

- **WHEN** routine tests inherit live-capture or narrowed test-selection inputs
- **THEN** routine gates select offline peers and their complete intended membership
- **AND** real model credentials are not required

### Requirement: Workflow business paths SHALL block CI and release gates

WF-01 SHALL be required by local PR/release gates and by independent blocking
compatibility cells: Linux Zotero 10 for pull requests, and Linux Zotero 7/9/10
for main and release. This explicitly requested promotion SHALL preserve existing
cell identities. Workflow cells SHALL use synthetic offline peers and a
current-source real sidecar, and SHALL NOT automatically retry failures.

#### Scenario: Required workflow cell fails

- **WHEN** WF-01 fails, aborts, remains incomplete, or fails cleanup or health
- **THEN** its required job fails and retains the first-attempt Run Manifest
- **AND** release publication cannot proceed on that result

#### Scenario: Workflow cell succeeds

- **WHEN** the workflow cell completes all 20 non-debug workflows
- **THEN** its complete passing Run Manifest and diagnostics are retained
- **AND** no external model or MinerU service is called

#### Scenario: CI has no personal Python environment

- **WHEN** the workflow cell runs on a clean GitHub runner
- **THEN** it uses the prepared declared Skill runtime without a developer-specific home path
