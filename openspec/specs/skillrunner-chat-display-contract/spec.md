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

### Requirement: SkillRunner transcript rendering SHALL support virtualized item snapshots

The SkillRunner browser chat layer SHALL render complete transcript item
snapshots through the shared transcript renderer's virtualized item-source mode
when transcript virtualization is enabled.

#### Scenario: Long SkillRunner transcript snapshot

- **WHEN** the SkillRunner run dialog receives a transcript snapshot containing
  many rendered conversation items
- **AND** transcript virtualization is enabled
- **THEN** the shared transcript renderer SHALL render a bounded DOM window from
  those items
- **AND** it SHALL NOT request transcript pages from the host.

#### Scenario: SkillRunner transcript context changes

- **WHEN** the visible SkillRunner request or selected task changes
- **THEN** the run dialog SHALL reset the shared transcript renderer virtual
  state for the new context
- **AND** rows from the prior context SHALL NOT be reused by later scroll
  renders.

#### Scenario: Transcript virtualization preference is disabled

- **WHEN** transcript virtualization is disabled
- **THEN** SkillRunner SHALL render the transcript through the existing
  non-virtualized path.

### Requirement: SkillRunner transcript publication SHALL follow execution display policy without owner navigation

Live mode SHALL publish each visible canonical chat mutation with an advancing transcript revision. Boundary mode MAY retain partial chunks but SHALL release them at a semantic message, waiting, or terminal boundary. Owner navigation SHALL NOT be required for either mode to converge.

#### Scenario: Live count and transcript advance together

- **WHEN** a selected live-mode run receives a visible chat event
- **THEN** the first snapshot reflecting its message count also contains the corresponding transcript state and revision.

#### Scenario: Boundary mode reaches assistant final

- **WHEN** held chunks reach an assistant-final boundary
- **THEN** the complete message is published without switching tasks.

