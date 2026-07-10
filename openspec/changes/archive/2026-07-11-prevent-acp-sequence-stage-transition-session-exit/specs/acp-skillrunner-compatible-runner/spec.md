## ADDED Requirements

### Requirement: ACP apply-result state and controller detach SHALL have explicit ownership

ACP Skills SHALL record workflow apply-result state independently from local controller detachment. Callers that own a terminal cleanup boundary SHALL invoke and await controller detach explicitly.

#### Scenario: State recording has no detach side effect
- **WHEN** Host records a pending, succeeded, or failed ACP workflow apply result
- **THEN** it SHALL update the persisted run state and event stream
- **AND** it SHALL NOT implicitly disconnect or unregister the live controller.

#### Scenario: Explicit detach is observable and idempotent
- **WHEN** an owner explicitly detaches a controller after terminal apply settlement
- **THEN** Host SHALL unregister that controller at most once
- **AND** it SHALL record detach start and completion or failure events
- **AND** the caller SHALL be able to await the detach operation.

#### Scenario: Normal and recovered continuation share cleanup semantics
- **WHEN** a non-final ACP sequence step succeeds during initial execution or recovered continuation
- **THEN** both paths SHALL use the same intermediate-step settlement policy before downstream dispatch.

#### Scenario: Failed step apply cleans up before propagation
- **WHEN** an ACP sequence step result apply fails
- **THEN** Host SHALL record the failed apply state and settle the owned controller before propagating the failure.
