## ADDED Requirements

### Requirement: Reconciler recovery is one-shot foreground handoff

The SkillRunner recovery coordinator SHALL NOT continuously poll jobs or apply
results. It SHALL run only after a SkillRunner backend transitions from
unavailable to reachable, or after managed local runtime post-up handoff, and
recoverable work SHALL be handed to foreground continuation.

#### Scenario: Interval reconcile skips ordinary foreground tasks

- **GIVEN** an active SkillRunner task is running under foreground ownership
- **WHEN** normal interval reconcile runs
- **THEN** it SHALL NOT call `GET /v1/jobs/{request_id}` for that task.

#### Scenario: Startup probe recovery hands off recoverable work

- **WHEN** plugin startup registers an enabled SkillRunner backend as
  unavailable
- **AND** the startup reachability probe succeeds
- **THEN** recoverable non-terminal or unapplied terminal runs SHALL be handed
  to foreground continuation once
- **AND** recovery SHALL NOT fetch `/result` or `/bundle` directly.

#### Scenario: Backend recovery scans only recovered backend

- **WHEN** a SkillRunner backend transitions from unavailable to reachable
- **THEN** recovery handoff SHALL run once for that backend only.

#### Scenario: Backend recovery de-dupes active sweeps

- **GIVEN** a backend recovery sweep is already in flight for a backend
- **WHEN** the same backend reports another recovered-health transition
- **THEN** recovery SHALL NOT start a second backend sweep for that backend.

#### Scenario: Only enabled reachable SkillRunner backends are submittable

- **GIVEN** a configured SkillRunner backend is disabled, unknown, probing, or
  unreachable
- **WHEN** submit-time settings collect visible backends
- **THEN** the backend SHALL be filtered out.

#### Scenario: Reachable enabled SkillRunner backend is submittable

- **GIVEN** a configured SkillRunner backend is enabled
- **AND** a successful probe or active connection has marked it reachable
- **WHEN** submit-time settings collect visible backends
- **THEN** the backend SHALL be included.

#### Scenario: Tracked backend is not implicitly reachable

- **WHEN** a configured SkillRunner backend is registered for health tracking
- **THEN** it SHALL remain unconfirmed reachable until a real successful
  backend operation is observed
- **AND** backend management UI SHALL NOT show it as reachable solely because
  it is configured.

#### Scenario: Disabled backend is not probed

- **GIVEN** a configured SkillRunner backend has `enabled:false`
- **WHEN** reachability probe scheduling runs
- **THEN** no health probe SHALL be issued for that backend
- **AND** its tasks SHALL be hidden from dashboard task lists.

#### Scenario: Reachability probe auto-disables stale backend

- **GIVEN** an enabled SkillRunner backend has no successful reachable event for
  six hours
- **WHEN** a due reachability probe cycle evaluates the backend
- **THEN** the backend configuration SHALL be updated to `enabled:false`
- **AND** a sticky runtime toast SHALL tell the user to re-enable it manually.

#### Scenario: Backend settings synchronize health tracking

- **WHEN** SkillRunner backend settings are saved
- **THEN** current SkillRunner backends SHALL be registered for health tracking
- **AND** removed SkillRunner backends SHALL be untracked.

#### Scenario: Missing context is unrecoverable

- **GIVEN** an active SkillRunner task has no recoverable run-store context
- **WHEN** one-shot recovery scans it
- **THEN** the task SHALL be marked failed locally
- **AND** recovery SHALL NOT write `apply.skipped`
- **AND** recovery SHALL NOT show a missing-context terminal success toast.

#### Scenario: Waiting runs stay detached

- **GIVEN** a recovered SkillRunner run is in `waiting_user` or `waiting_auth`
- **WHEN** one-shot recovery scans it
- **THEN** the task projection SHALL remain waiting with reply controls
- **AND** recovery SHALL NOT poll the job until a user reply/auth action starts
  foreground continuation.

### Requirement: Request-ready is submit phase only

SkillRunner dashboard projections SHALL NOT use `request_ready` as the current
run lifecycle state.

#### Scenario: Request-ready projects as running with submit phase

- **WHEN** a SkillRunner request reaches the request-ready boundary before a
  backend waiting or terminal status is observed
- **THEN** the task lifecycle SHALL be `running`
- **AND** the task submit phase MAY be `request_ready`.

#### Scenario: Waiting backend status wins over submit phase

- **WHEN** a SkillRunner sequence step reaches `waiting_user` or `waiting_auth`
- **THEN** the task lifecycle SHALL be that waiting state
- **AND** reply controls SHALL be enabled.
