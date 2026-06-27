## MODIFIED Requirements

### Requirement: ACP Panels Expose Streaming Render Toggle

ACP Chat, ACP Skills, and SkillRunner SHALL show a toolbar switch for the global
streaming render preference. The switch SHALL be right-aligned in the managed
toolbar, use a green visual state when enabled, and use a red visual state when
disabled.

The Preferences checkbox and all three toolbar switches SHALL read and write
the same global preference. Changing the state from any of these surfaces SHALL
update the other open surfaces. The persisted Zotero preference SHALL be the
single source of truth; Assistant Workspace SHALL observe preference changes
instead of treating its toolbar switch state as authoritative.

The preference label and help text SHALL describe Assistant Workspace streaming
render behavior rather than ACP-only behavior.

#### Scenario: any panel switch updates all panels

- **GIVEN** ACP Chat, ACP Skills, and SkillRunner surfaces are open
- **WHEN** the user changes the streaming render switch in any one panel
- **THEN** the other panels receive the same preference state on their next
  snapshot
- **AND** the Preferences checkbox reflects the same state.

#### Scenario: Preferences checkbox updates all panels

- **WHEN** the user changes the Preferences checkbox
- **THEN** the persisted preference is updated from that user activation
- **AND** ACP Chat, ACP Skills, and SkillRunner toolbar switches reflect the
  same state.

#### Scenario: Preferences remains authoritative after reopening

- **GIVEN** Assistant Workspace and Preferences are open
- **WHEN** the user changes the streaming render checkbox in Preferences
- **AND** closes and reopens Preferences
- **THEN** the reopened checkbox reflects the persisted preference value
- **AND** Assistant Workspace does not overwrite it with a stale toolbar state.

### Requirement: Assistant live refreshes preserve active reply controls

The shared assistant panel renderer SHALL preserve active reply-control DOM
state when a snapshot changes unrelated panel data.

#### Scenario: Unrelated snapshot keeps focused textarea

- **WHEN** a managed assistant reply textarea is focused
- **AND** a subsequent snapshot keeps the same reply context and control shape
- **THEN** the renderer SHALL keep the same textarea DOM node
- **AND** it SHALL preserve the user's current value and selection.

#### Scenario: Metadata-only snapshot skips transcript rendering

- **WHEN** a child panel receives a snapshot whose transcript revision is
  unchanged
- **THEN** the transcript renderer SHALL NOT be invoked
- **AND** toolbar, banner, drawer, details, and reply regions MAY still update.
