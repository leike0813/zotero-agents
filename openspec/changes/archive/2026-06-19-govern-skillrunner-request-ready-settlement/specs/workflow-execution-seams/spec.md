## ADDED Requirements

### Requirement: SkillRunner workflow seams MUST delegate post-ready completion to the reconciler

Workflow execution seams SHALL treat SkillRunner request-ready provider results
as backend-owned deferred work, regardless of auto or interactive execution
mode.

#### Scenario: SkillRunner request-ready result is reconcile-owned pending

- **WHEN** a SkillRunner provider returns a deferred result after request-ready
- **THEN** workflow apply seams SHALL count the job as reconcile-owned pending
- **AND** foreground apply seams SHALL NOT execute SkillRunner result apply
- **AND** completion SHALL be driven by reconciler settlement of the actual
  request id

#### Scenario: ACP foreground apply remains unchanged

- **WHEN** the executing backend is ACP
- **THEN** ACP sequence and apply seams MAY continue to use foreground
  conversation/apply behavior
- **AND** ACP apply state SHALL be written only through ACP run-store APIs

### Requirement: SkillRunner sequence continuation MUST depend on result and handoff, not apply

SkillRunner sequence orchestration SHALL continue after execution result and
required handoff projection are available.

#### Scenario: apply failure does not block next step

- **WHEN** a SkillRunner sequence step reaches terminal success
- **AND** its result and required handoff projection are available
- **AND** its deferred apply fails or remains pending
- **THEN** the sequence SHALL be allowed to continue to the next step
- **AND** the apply failure SHALL remain visible on the completed step run

#### Scenario: required handoff failure stops sequence

- **WHEN** a SkillRunner sequence step succeeds
- **AND** the next step explicitly requires a handoff projection that cannot be
  produced
- **THEN** the sequence SHALL stop or fail according to workflow failure policy
- **AND** the failed handoff/apply diagnostic SHALL remain visible
