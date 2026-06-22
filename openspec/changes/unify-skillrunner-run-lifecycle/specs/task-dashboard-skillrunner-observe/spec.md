## ADDED Requirements

### Requirement: SkillRunner recovery MUST scan run store SSOT

SkillRunner recovery MUST scan local SkillRunner run records as the lifecycle SSOT and MUST NOT use backend-wide scans as fallback truth.

#### Scenario: Recoverable request-ready row is handed off

- **GIVEN** a local SkillRunner run has `runKey`, `requestId`, and
  `submitPhase = "request_ready"`
- **WHEN** startup, backend-health, or local-runtime-up recovery runs
- **THEN** recovery MUST project that run from the local run store
- **AND** it MAY hand the projected run to foreground continuation.

#### Scenario: Backend-wide scan is not lifecycle fallback

- **GIVEN** a backend has running requests
- **WHEN** local SkillRunner run records are missing or unprojectable
- **THEN** recovery MUST NOT create lifecycle rows from a backend-wide scan
- **AND** the missing local lifecycle projection MUST be treated as a local
  state bug to fix.

### Requirement: SkillRunner observation MUST consume run projections only

Dashboard SkillRunner observation surfaces MUST consume `SkillRunnerRunProjection` rows derived from the run store and registry cascades.

#### Scenario: Dashboard reads projected skill name

- **GIVEN** a SkillRunner run has `skillId`
- **WHEN** the dashboard renders the row
- **THEN** it MUST read `skillName` from the projection
- **AND** it MUST NOT expect `skillLabel` in the lifecycle record.

#### Scenario: Dashboard actions use projected capabilities

- **GIVEN** a SkillRunner run projection contains `canReply` and
  `canCancelBackendRun`
- **WHEN** the dashboard renders row actions
- **THEN** it MUST use those projected capabilities
- **AND** it MUST NOT independently decide lifecycle state from UI-only fields.

### Requirement: SkillRunner lifecycle invariants MUST be SSOT-governed

SkillRunner lifecycle invariants MUST capture lifecycle, projection, terminal ownership, and recovery scan rules as YAML invariants.

#### Scenario: Design round records invariants without runtime facts

- **GIVEN** this change is in the design-only round
- **WHEN** the invariant YAML is added
- **THEN** it MUST document the intended `SKILLRUNNER_SSOT_FACTS` anchors
- **AND** it MUST NOT require runtime code changes in this round.

#### Scenario: Implementation round wires invariants to checker

- **GIVEN** the runtime implementation adds `SKILLRUNNER_SSOT_FACTS.runLifecycle`
- **WHEN** the invariant checker is updated
- **THEN** the lifecycle invariant YAML MUST become part of
  `check:ssot-invariants`.
