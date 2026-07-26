## MODIFIED Requirements

### Requirement: SkillRunner sidebar refreshes use Assistant Workspace publish governance

SkillRunner sidebar snapshots SHALL use the global `live`, `boundary`, or `silent` Assistant Workspace policy. Canonical run state, foreground SSE, HTTP history catch-up, pending/auth refresh, interaction, permission, terminal handling, and semantic message counting SHALL remain active in every mode.

SkillRunner SHALL keep canonical backend history separate from its UI-visible publication mirror. When a selected run starts with local pre-request notices and later receives backend history, the next eligible snapshot SHALL publish that history with a new transcript revision. A critical refresh SHALL NOT leave the live-mode mirror pinned to local notices. HTTP history and SSE entries SHALL use the same normalized semantic-boundary classifier.

SkillRunner SHALL normalize Assistant replacement identity and Thought/Tool process identity before counting. Assistant final promotion SHALL not double-count an intermediate message. Each reasoning segment and new tool/command call SHALL count once, while updates for the same stable identity SHALL not increment. Silent process entries SHALL remain absent from the visible transcript while their counts advance.

#### Scenario: live text advances naturally

- **GIVEN** mode is `live`
- **WHEN** SkillRunner receives assistant or process text
- **THEN** the visible transcript advances without waiting for metadata cadence
- **AND** semantic category counts advance.

#### Scenario: critical history catch-up replaces local-only mirror

- **GIVEN** mode is `live`
- **AND** a selected SkillRunner run has published only local pre-request notices
- **WHEN** a critical refresh catches up backend history for the same owner
- **THEN** the first snapshot reflecting the new semantic counts SHALL include the eligible backend messages
- **AND** its transcript revision SHALL be newer than the local-only snapshot.

#### Scenario: boundary history uses SSE semantic classification

- **GIVEN** mode is `boundary`
- **AND** a selected SkillRunner run has unpublished backend history
- **WHEN** a history batch contains an entry classified as a semantic boundary by the SSE boundary rule
- **THEN** the accumulated eligible history SHALL publish once with a new transcript revision.

#### Scenario: boundary behavior remains unchanged

- **GIVEN** mode is `boundary`
- **WHEN** SkillRunner receives complete message, thought, and tool process entries
- **THEN** complete messages and non-tool thoughts publish at their existing boundaries
- **AND** tool processes wait for the existing eligible boundary.

#### Scenario: silent process is counted but suppressed

- **GIVEN** mode is `silent`
- **WHEN** SkillRunner receives reasoning, tool, command, and intermediate assistant entries
- **THEN** process entries remain absent from the visible transcript
- **AND** Assistant, Thought, and Tool counts advance by normalized semantic identity.

#### Scenario: final promotes intermediate identity

- **GIVEN** an intermediate Assistant message has been counted
- **WHEN** an `assistant_final` replaces the same message family or id
- **THEN** the final appears according to the display policy
- **AND** the Assistant count does not increment again.

#### Scenario: terminal and restart retain counts

- **WHEN** a run becomes terminal and is later reopened
- **THEN** its last current and cumulative category values are restored
- **AND** foreground observation and critical-state behavior remain unchanged.
