## MODIFIED Requirements

### Requirement: SkillRunner sidebar refreshes use Assistant Workspace publish governance

SkillRunner sidebar snapshots SHALL use the global `live`, `boundary`, or `silent` Assistant Workspace policy. Canonical run state, foreground SSE, pending/auth refresh, interaction, permission, and terminal handling SHALL remain active in every mode.

In `live`, assistant/process text SHALL advance naturally. In `boundary`, complete assistant messages and non-tool thought boundaries SHALL retain their existing publication behavior. In `silent`, `assistant_process` and `assistant_message` entries SHALL not appear; semantic assistant messages SHALL update only the owner-scoped count, and `assistant_final`, user/interaction content, and critical states SHALL publish immediately.

#### Scenario: live text advances naturally

- **GIVEN** mode is `live`
- **WHEN** SkillRunner receives assistant or process text
- **THEN** the visible transcript advances without waiting for metadata cadence.

#### Scenario: boundary behavior remains unchanged

- **GIVEN** mode is `boundary`
- **WHEN** SkillRunner receives complete message, thought, and tool process entries
- **THEN** complete messages and non-tool thoughts publish at their existing boundaries
- **AND** tool processes wait for the existing eligible boundary.

#### Scenario: silent process is suppressed

- **GIVEN** mode is `silent`
- **WHEN** SkillRunner receives reasoning, tool, command, and intermediate assistant entries
- **THEN** process entries remain absent from the visible transcript
- **AND** each distinct semantic assistant message advances the count once.

#### Scenario: silent final promotes intermediate identity

- **GIVEN** a silent intermediate assistant message has been counted
- **WHEN** an `assistant_final` replaces the same message family or id
- **THEN** the final appears immediately
- **AND** the semantic message count does not increment again.

#### Scenario: foreground observation and critical state remain active

- **WHEN** a silent run uses foreground SSE and enters waiting_user, waiting_auth, permission, error, cancel, or terminal state
- **THEN** observation remains on SSE
- **AND** the critical state publishes immediately.

