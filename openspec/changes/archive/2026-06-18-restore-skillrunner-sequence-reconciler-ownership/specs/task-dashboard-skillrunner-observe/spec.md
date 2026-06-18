## MODIFIED Requirements

### Requirement: SkillRunner recoverable terminal apply MUST have a single owner

Plugin MUST ensure exactly one execution path owns terminal `applyResult` for
SkillRunner runs.

#### Scenario: SkillRunner sequence terminal success applies only through reconciler

- **GIVEN** a SkillRunner request belongs to a sequence step
- **WHEN** the request reaches terminal success
- **THEN** foreground workflow apply SHALL NOT apply that step
- **AND** `SkillRunnerTaskReconciler` SHALL apply the step result when declared
- **AND** plugin SHALL NOT execute the outer sequence workflow apply for that
  step request

#### Scenario: SkillRunner sequence apply does not update ACP run store

- **WHEN** a SkillRunner sequence step apply succeeds or fails
- **THEN** plugin SHALL update SkillRunner task/runtime and sequence state
- **AND** plugin SHALL NOT write ACP skill-run apply state for that request

#### Scenario: SkillRunner sequence waits for reconciler settlement

- **WHEN** a SkillRunner sequence step is waiting for reconciler-owned terminal
  apply
- **THEN** workflow completion SHALL remain pending/deferred
- **AND** plugin SHALL NOT emit an unknown foreground apply failure toast for
  the sequence root
