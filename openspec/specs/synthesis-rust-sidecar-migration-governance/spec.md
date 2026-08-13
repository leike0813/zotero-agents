# synthesis-rust-sidecar-migration-governance Specification

## Purpose
Governs the Rust sidecar migration by binding local worker-transfer parity evidence and candidate-workflow ordering, and serves as the anchor for the cutover separation governance added by the cut-over change.
## Requirements
### Requirement: R8 local acceptance SHALL include native worker-transfer parity

R8 local gates SHALL run a shared Node/Rust worker-transfer corpus covering lifecycle, integrity, bounds, busy admission, expiry, cleanup, rollback, retry, canonical bytes, and hashes.

#### Scenario: Local migration gates run
- **WHEN** R8 implementation is validated
- **THEN** the native worker-transfer checker, Rust tests, Stage-1 suite, smoke, and 15/75 MiB gates SHALL pass
- **AND** Node remains a read-only differential oracle

### Requirement: Candidate workflow SHALL check worker-transfer ownership before smoke

The seven-platform read-only candidate workflow SHALL run the native worker-transfer checker before native smoke and SHALL NOT publish, dispatch a release, or change production ownership.

#### Scenario: Candidate workflow is inspected
- **WHEN** workflow steps are ordered
- **THEN** worker-transfer parity SHALL precede smoke on every platform
- **AND** release, XPI cutover, signing claims, and Gitee synchronization SHALL remain absent

### Requirement: R9a implementation MAY proceed with R8 remote evidence deferred

R8 seven-platform remote evidence MAY remain an explicit external debt while R9a artifacts and local implementation proceed. The debt MUST NOT be represented as passing evidence, and R9a SHALL NOT dispatch, publish, sign, synchronize, or declare complete R9/Stage 1 release acceptance.

#### Scenario: R9a local acceptance is reported
- **WHEN** local contracts, cutover rehearsal, tests, and builds pass without R8 remote results
- **THEN** the report identifies the remote evidence as pending
- **AND** makes no seven-platform, signed-XPI, or real-machine completion claim

### Requirement: R9a and R9b SHALL remain separately auditable

R9a SHALL transfer production ownership and make legacy code unreachable from production. Physical deletion of Node runtime, legacy implementation, dependencies, and release branches SHALL occur only in the separate R9b change within the same release milestone.

#### Scenario: R9a deletion inventory is reviewed
- **WHEN** R9a is ready for verification
- **THEN** production routes contain no legacy fallback
- **AND** retained oracle source is listed for R9b rather than deleted opportunistically

### Requirement: Acceptance SHALL require one source-fresh evidence chain

Sidecar acceptance SHALL require all four application differential gates, the governed 2k/10k/25k production-route performance gate, and the complete unfiltered core suite to pass from the same candidate source identity. Intentional differential normalization SHALL be exact, role-specific, and centrally owned.

#### Scenario: Candidate is proposed for acceptance
- **WHEN** any required gate has no current-source sample, fails, is filtered, or relies on a broad table or payload allowance
- **THEN** acceptance remains blocked

#### Scenario: Rust has the registered redirect-graph migration marker
- **WHEN** the Rust parity database contains the exact registered marker absent from the baseline Node oracle
- **THEN** the central parity policy may omit only that exact Rust key/value row
- **AND** every other schema row remains part of the differential

### Requirement: Production route evidence SHALL verify behavior rather than Rust source shape

The durable production-capability gate SHALL continue to compare the language-neutral manifest, operation metadata, grouped TypeScript contract, and surface corpora. Rust verification SHALL independently prove manifest fingerprint integrity, catalog completeness, plan validity, membership, and representative dispatch behavior. Acceptance evidence MUST NOT require a duplicated Rust ready roster, digest constant, fixed inventory count, registration macro, or dispatcher source-text pattern.

#### Scenario: Internal Rust organization changes without contract drift
- **WHEN** the manifest, grouped client, corpora, validated Rust catalog, and observable route behavior remain coherent
- **THEN** the production-capability gate passes without inspecting Rust implementation text

#### Scenario: Rust catalog loses a declared route
- **WHEN** the embedded manifest declares a capability with no Rust handler
- **THEN** Rust catalog validation fails before readiness
- **AND** language-neutral inventory evidence remains unchanged rather than being rewritten to hide the defect
