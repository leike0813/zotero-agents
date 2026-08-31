## ADDED Requirements

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
