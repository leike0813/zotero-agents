## ADDED Requirements

### Requirement: SkillRunner auto-reply waiting observer SHALL be opt-in and handoff-only

The plugin SHALL observe SkillRunner `waiting_user` auto-reply runs only when a
hard-coded feature switch is enabled and the run request explicitly enabled
`interactive_auto_reply`.

#### Scenario: Default-off auto reply behaves like normal waiting detach

- **WHEN** a SkillRunner interactive run enters `waiting_user`
- **AND** the auto-reply feature switch is disabled
- **THEN** the plugin SHALL NOT start background job polling for that waiting run
- **AND** the task SHALL remain user-replyable as before.

#### Scenario: Enabled auto reply resumes through foreground continuation

- **WHEN** an auto-reply-enabled SkillRunner run is locally `waiting_user`
- **AND** backend state changes to `running`, `succeeded`, `failed`, or `canceled`
- **THEN** the observer SHALL stop observing that request
- **AND** it SHALL hand off to foreground continuation
- **AND** it SHALL NOT fetch result or apply directly.

#### Scenario: Observer stops when local or backend ownership disappears

- **WHEN** an auto-reply observer is active
- **AND** the local run becomes terminal, archived, deleted, no longer waiting,
  or no longer auto-reply-enabled
- **THEN** the observer SHALL stop without settling or applying the run.

#### Scenario: Observer stops while backend is unreachable

- **WHEN** an auto-reply observer state check fails because the backend is not
  reachable
- **THEN** the observer SHALL stop
- **AND** backend recovery SHALL be responsible for recreating an observer if
  the run is still waiting after reachability is restored.

#### Scenario: User reply racing backend auto reply is reconciled

- **WHEN** a user replies to an auto-reply-enabled `waiting_user` run
- **AND** the backend has already left `waiting_user`
- **THEN** the plugin SHALL avoid treating the late reply as local terminal failure
- **AND** it SHALL use the latest backend state to hand off to foreground continuation.

### Requirement: SkillRunner auto-reply observer state SHALL be visible in task UI

Interactive auto-reply SkillRunner tasks SHALL expose a compact Auto Reply
indicator next to the existing interaction indicator.

#### Scenario: Auto reply indicator is inactive before observer starts

- **WHEN** a SkillRunner task is interactive and auto reply is enabled
- **AND** no observer is active for its request
- **THEN** the task UI SHALL show an inactive Auto Reply indicator.

#### Scenario: Auto reply indicator shows active countdown for foreground observer

- **WHEN** a foreground auto-reply observer is active
- **AND** the configured timeout is greater than zero
- **THEN** the task UI SHALL show an active Auto Reply indicator with a
  remaining-seconds value.

#### Scenario: Recovery observer hides countdown

- **WHEN** a recovery-started auto-reply observer is active
- **THEN** the task UI SHALL show an active Auto Reply indicator without a
  countdown value.
