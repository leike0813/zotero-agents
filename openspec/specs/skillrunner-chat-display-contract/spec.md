# skillrunner-chat-display-contract Specification

## Purpose
TBD - created by archiving change skillrunner-structured-display-protocol-upgrade. Update Purpose after archive.
## Requirements
### Requirement: SkillRunner frontend MUST prefer backend-projected final display text

Plugin chat rendering MUST treat `assistant.message.final` as already projected
display content.

#### Scenario: final event includes projected display text

- **WHEN** a run-dialog message snapshot includes `displayText`
- **THEN** the browser chat layer MUST render `displayText` as the user-facing
  final text
- **AND** raw `text` MUST remain available only as compatibility metadata

#### Scenario: final event omits projected display text

- **WHEN** a final message snapshot has no `displayText`
- **THEN** the browser chat layer MAY fall back to raw `text`

### Requirement: SkillRunner frontend chat rendering MUST stay free of local structured dispatch

Frontend display MUST not re-interpret structured-output markers to decide chat
rendering.

#### Scenario: structured output reaches the browser chat layer

- **WHEN** browser chat rendering consumes run-dialog snapshot messages
- **THEN** it MUST render backend-projected display text without parsing
  `__SKILL_DONE__`
- **AND** it MUST NOT locally dispatch on structured JSON payload text

#### Scenario: prompt fallback remains non-duplicating

- **WHEN** pending UI hints are absent
- **THEN** the prompt card MAY fall back to compatibility prompt text or a
  default open-text prompt
- **AND** it MUST still avoid repeating the chat-body message

### Requirement: SkillRunner transcript rendering MUST not depend on frame-nested timers

The SkillRunner browser chat layer MUST render transcript DOM without requiring
a timer callback scheduled from inside a `requestAnimationFrame` callback. It
MUST preserve transcript revision gating, chat display mode gating, stale-render
protection, and pending snapshot coalescing while using a deterministic local
scheduling path for the actual transcript render.

#### Scenario: visible SkillRunner iframe receives a transcript snapshot

- **WHEN** the visible SkillRunner child panel receives a workspace snapshot
  whose transcript revision has not yet been rendered
- **THEN** the panel MUST invoke the transcript renderer without waiting for a
  `setTimeout` callback scheduled inside `requestAnimationFrame`
- **AND** the transcript container MUST render either transcript rows or the
  configured empty transcript state

#### Scenario: repeated snapshot does not re-render unchanged transcript

- **WHEN** the SkillRunner child panel receives a later snapshot with the same
  transcript revision and the same chat display mode
- **THEN** the panel MUST skip transcript rendering
- **AND** non-transcript panel regions MAY still refresh normally

#### Scenario: stale scheduled render is superseded

- **WHEN** multiple transcript snapshots are scheduled before the pending render
  callback executes
- **THEN** only the latest render token MUST be allowed to update the transcript
- **AND** older scheduled callbacks MUST exit without mutating transcript DOM

