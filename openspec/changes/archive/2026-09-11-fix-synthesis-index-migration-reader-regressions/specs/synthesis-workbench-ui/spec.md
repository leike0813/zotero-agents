## ADDED Requirements

### Requirement: Topic Report SHALL preserve its first rendered content

The Reader SHALL give its component tree stable ownership of the Topic Report frame, outline slot, and scroll-body slot. Imperative Markdown rendering SHALL be confined to descendants of those slots and SHALL rebuild only when report content semantics change. Unrelated Reader updates SHALL retain the report body, outline, actions, and scroll-container identity from the first open.

#### Scenario: Unrelated Reader state changes after first report open

- **WHEN** the user opens the first Topic Report in a plugin session and the Reader subsequently receives the same report with unrelated pending-command or chrome state changes
- **THEN** the visible Markdown body and outline SHALL remain present
- **AND** the report frame and scroll-body DOM identities SHALL remain unchanged
- **AND** the report body SHALL remain scrollable below the toolbar.

