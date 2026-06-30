## ADDED Requirements

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
