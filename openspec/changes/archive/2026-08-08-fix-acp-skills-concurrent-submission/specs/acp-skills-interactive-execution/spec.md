## ADDED Requirements

### Requirement: ACP Skill setup is observable per request

ACP Skills SHALL record stable request-scoped setup stages for an admitted run,
including workspace creation, registry readiness, skill materialization, Host
Bridge CLI readiness, runtime dependency resolution, adapter creation,
transport spawn, ACP initialization, session creation, and prompt start. Stage
records SHALL retain the request and submission-unit identity and SHALL NOT
include credentials or full request payloads.

#### Scenario: Concurrent setup stages are distinguishable

- **GIVEN** two ACP Skill units are admitted from one submission
- **WHEN** both units progress through setup
- **THEN** each run SHALL expose its own last completed setup stage
- **AND** each run SHALL retain its own `requestId`, `submissionId`, and
  `submissionUnitId`
- **AND** available transport diagnostics SHALL retain the run's `spawnId` and
  child identity.

### Requirement: ACP Skill setup is cancellable before a live session

ACP Skills SHALL expose an internal setup cancellation handle immediately after
run creation and before the first potentially blocking setup await. Setup
cancellation SHALL record a terminal canceled intent and SHALL NOT mark the run
as connected, recoverable, or eligible for ordinary disconnect/recovery.

#### Scenario: Setup is canceled before adapter creation

- **GIVEN** an ACP Skill run has been created but its adapter does not yet exist
- **WHEN** the run is canceled
- **THEN** subsequent setup stages SHALL stop at their next cancellation check
- **AND** the run SHALL settle as `canceled`
- **AND** no session or prompt SHALL be created.

#### Scenario: Adapter is created after setup cancellation

- **GIVEN** cancellation wins while adapter creation is still in flight
- **WHEN** adapter creation resolves
- **THEN** the adapter SHALL be closed immediately
- **AND** the run SHALL not register a live controller or start a session.

### Requirement: Setup-to-live controller replacement is identity-safe

When an ACP Skill run becomes live, its setup cancellation handle SHALL be
atomically replaced by the live controller. Cleanup SHALL remove only the
controller or setup handle identity it owns and SHALL NOT remove a newer live
controller installed for the same request.

#### Scenario: Late setup cleanup cannot detach a live controller

- **GIVEN** a run transitions from setup to a live controller
- **WHEN** an earlier setup cleanup callback runs
- **THEN** the live controller SHALL remain registered
- **AND** the run SHALL retain the existing connected/recovery behavior.

### Requirement: Existing live ACP lifecycle remains unchanged

The setup lifecycle change SHALL preserve existing live cancel, interrupt,
disconnect, reply, permission, session recovery, waiting-user detach, and
workflow-apply slot semantics. Hard timeout measurement SHALL continue to begin
from prompt-ready rather than setup start.

#### Scenario: Live run retains existing controls

- **GIVEN** an ACP Skill run has created a session and registered its live
  controller
- **WHEN** the user cancels, disconnects, replies, or recovers the run
- **THEN** the existing live controller paths and persisted state transitions
  SHALL be used.
