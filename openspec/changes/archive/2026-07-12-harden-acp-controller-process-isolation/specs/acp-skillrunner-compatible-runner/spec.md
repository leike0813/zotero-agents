## ADDED Requirements

### Requirement: ACP Skills lifecycle cleanup SHALL use the shared controller close
ACP Skills and the SkillRunner-compatible runner SHALL use the shared transport controller for local execution, recovery, sequence, probe, diagnostic, failure, detach, and shutdown cleanup.

#### Scenario: Normal and recovered runs share controller safety
- **WHEN** a local ACP Skills run starts normally or through recover, resume, or load
- **THEN** all owned session transports SHALL use the same shared controller teardown policy.

#### Scenario: Terminal paths share controller safety
- **WHEN** a run is cancelled, interrupted, hard-timed-out, explicitly disconnected, ended, detached after apply, fails, or is closed during shutdown
- **THEN** the owning path SHALL close the shared controller
- **AND** it SHALL NOT duplicate process-group ownership logic.

#### Scenario: Sequence detach ordering is preserved
- **WHEN** a sequence step reaches its awaited detach boundary
- **THEN** it SHALL await the shared controller close using the existing sequence lifecycle semantics
- **AND** this change SHALL NOT synthesize an apply result or alter workflow output.

#### Scenario: Diagnostic paths share controller safety
- **WHEN** an ACP Skills diagnostic uses an adapter session or a raw transport probe
- **THEN** both paths SHALL enter the shared controller boundary.

