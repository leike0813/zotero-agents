## ADDED Requirements

### Requirement: Workbench exposes Concepts management view

The Synthesis Workbench SHALL expose a Concepts tab for search, browsing, and display-text editing.

#### Scenario: Workbench state is initialized

- **WHEN** Synthesis Workbench UI state is created
- **THEN** Concepts tab state SHALL include search, type/status/topic filters, selected concept, and overlay enabled state.

#### Scenario: Concept detail renders

- **WHEN** a concept is selected
- **THEN** the Workbench SHALL show concept identity, senses, aliases, relations, topic links, projection state, and diagnostics.
- **AND** identity, alias, relation, source, status, and provenance fields SHALL be read-only.

#### Scenario: Display text edit is requested

- **WHEN** the user edits concept display text
- **THEN** the UI SHALL route only `short_definition`, `definition`, `usage_note`, or `editorial_note` through a host command.

### Requirement: Concept overlay links text non-destructively

The Workbench SHALL provide dynamic concept links and bubbles without rewriting source artifacts.

#### Scenario: Overlay renders concept links

- **WHEN** overlay is enabled for reader content
- **THEN** high-confidence unambiguous aliases SHALL render as concept links
- **AND** clicking a link SHALL show a concept bubble without navigation loss.

#### Scenario: Unsafe content is skipped

- **WHEN** content appears inside code, pre, JSON, math, or existing links
- **THEN** concept overlay SHALL NOT link that content.
