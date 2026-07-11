## MODIFIED Requirements

### Requirement: ACP Panels Expose Streaming Render Toggle

ACP Chat, ACP Skills, and SkillRunner SHALL show a right-aligned three-segment control for the global Assistant execution display mode. The available values SHALL be `live`, `boundary`, and `silent`, presented as Live, By message, and Silent. The control SHALL expose radiogroup/radio semantics, the selected state, localized labels, and keyboard navigation. Its live, boundary, and silent states SHALL be visually distinct and SHALL remain usable in narrow sidebars.

Preferences and all three toolbar controls SHALL read and write the same persisted Zotero preference. Changing the mode from any surface SHALL update the other open surfaces. The persisted preference SHALL be the single source of truth; child panels SHALL NOT treat their rendered selection as authoritative.

The preference label and help text SHALL explain that silent mode intentionally omits process content from ACP transcripts and does not backfill it later.

#### Scenario: any panel control updates all panels

- **GIVEN** ACP Chat, ACP Skills, and SkillRunner surfaces are open
- **WHEN** the user selects a display mode in any one panel
- **THEN** the other panels receive the same mode on their next snapshot
- **AND** Preferences reflects the same selected mode.

#### Scenario: Preferences updates all panels

- **WHEN** the user selects a display mode in Preferences
- **THEN** the persisted preference is updated from that user activation
- **AND** all Assistant Workspace toolbar controls reflect the same mode.

#### Scenario: Preferences remains authoritative after reopening

- **GIVEN** Assistant Workspace and Preferences are open
- **WHEN** the user changes the display mode in Preferences and reopens it
- **THEN** the reopened control reflects the persisted mode
- **AND** Assistant Workspace does not overwrite it with stale rendered state.

#### Scenario: segmented control is keyboard accessible

- **WHEN** focus is on the execution display radiogroup
- **THEN** arrow, Home, and End keys select the corresponding mode
- **AND** the selected radio exposes `aria-checked=true`.

## ADDED Requirements

### Requirement: Silent progress is transcript-owned

While silent work is active, each Assistant panel SHALL show one owner-scoped semantic agent-message count in the transcript region. The count SHALL NOT be represented as a durable transcript row or pagination item.

#### Scenario: same-owner count advances

- **WHEN** another semantic assistant message begins for the selected owner
- **THEN** the existing transcript progress node updates its count
- **AND** non-transcript managed regions preserve their DOM identity.

