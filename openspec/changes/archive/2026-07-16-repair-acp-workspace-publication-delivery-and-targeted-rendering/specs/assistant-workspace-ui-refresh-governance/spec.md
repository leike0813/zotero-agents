## ADDED Requirements

### Requirement: Steady transcript rendering is target-local

Assistant Workspace SHALL represent accepted transcript mutations as target-local render effects. Steady append, patch, upsert, delete, and off-page metadata effects SHALL preserve every unaffected transcript row and every non-transcript managed-region DOM node. Transcript revision changes alone SHALL NOT clear or rebuild the transcript container.

#### Scenario: Streaming text appends

- **WHEN** an accepted delta appends text to a visible item
- **THEN** the renderer appends to that item's text node
- **AND** the row, text node, other rows, toolbar, banner, plan, hint, reply, context, details, and permission nodes retain identity.

#### Scenario: Historical page receives an off-page delta

- **WHEN** a selected historical page receives a delta outside its window
- **THEN** only bounded page metadata changes
- **AND** no tail item is inserted and scroll position does not jump.

### Requirement: Child initialization is delivery-based and generation-scoped

Assistant Workspace SHALL consider a child initialized only after a publication enters the delivery lifecycle for the current child document generation. Scheduling asynchronous snapshot preparation SHALL NOT suppress a later ready-triggered initialization.

#### Scenario: Child ready races snapshot preparation

- **WHEN** child ready arrives while initial page preparation is pending
- **THEN** the current generation still receives one ordered owner-first/page-first initialization
- **AND** duplicate ready messages for that generation do not create duplicate DOM work.
