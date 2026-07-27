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

The five-platform read-only candidate workflow SHALL run the native worker-transfer checker before native smoke and SHALL NOT publish, dispatch a release, or change production ownership.

#### Scenario: Candidate workflow is inspected
- **WHEN** workflow steps are ordered
- **THEN** worker-transfer parity SHALL precede smoke on every platform
- **AND** release, XPI cutover, signing claims, and Gitee synchronization SHALL remain absent

### Requirement: R9a implementation MAY proceed with R8 remote evidence deferred

R8 five-platform remote evidence MAY remain an explicit external debt while R9a artifacts and local implementation proceed. The debt MUST NOT be represented as passing evidence, and R9a SHALL NOT dispatch, publish, sign, synchronize, or declare complete R9/Stage 1 release acceptance.

#### Scenario: R9a local acceptance is reported
- **WHEN** local contracts, cutover rehearsal, tests, and builds pass without R8 remote results
- **THEN** the report identifies the remote evidence as pending
- **AND** makes no five-platform, signed-XPI, or real-machine completion claim

### Requirement: R9a and R9b SHALL remain separately auditable

R9a SHALL transfer production ownership and make legacy code unreachable from production. Physical deletion of Node runtime, legacy implementation, dependencies, and release branches SHALL occur only in the separate R9b change within the same release milestone.

#### Scenario: R9a deletion inventory is reviewed
- **WHEN** R9a is ready for verification
- **THEN** production routes contain no legacy fallback
- **AND** retained oracle source is listed for R9b rather than deleted opportunistically

