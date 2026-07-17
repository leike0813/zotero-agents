## ADDED Requirements

### Requirement: Every shared ACP managed region has an independent signature

The Assistant Workspace SHALL reconcile toolbar, banner, message counts,
transcript, plan, hint, composer, context drawer, details drawer, and permission
drawer from an independent signature containing only that region's visible
content and local open or
collapsed state. Transcript revision, page signature, streaming chunks, item
counts, prompting tail, and log tail SHALL NOT enter non-transcript signatures.

#### Scenario: A transcript-only publication is accepted

- **WHEN** a transcript delta, loading state, or streaming chunk changes for the selected owner
- **THEN** only the transcript region is rendered
- **AND** toolbar, banner, plan, hint, composer, context, details, permission, and Runner pane nodes retain identity.

### Requirement: Empty and owner-switch states preserve layout geometry

The main grid SHALL remain mounted as transcript, plan, hint, and composer rows
when no owner is selected, while owner changes SHALL close local context chrome
and publish the new owner loading state before indexed page or full-mirror work.

#### Scenario: Selection changes from one cold owner to another

- **WHEN** the user selects a different session or run
- **THEN** the drawer closes synchronously and the new owner empty/loading state paints first
- **AND** transcript hydration does not block the first owner-specific paint.

### Requirement: Hint has an explicit publication-to-region route

The managed-region registry SHALL include the hint region. Owner-control and
permission publications SHALL be allowed to update it, while composer and
transcript publications SHALL NOT rebuild it. Its signature SHALL contain only
the projected semantic interaction visible to the user.

#### Scenario: Composer options change without interaction change

- **WHEN** mode, model, reasoning, usage, or reply availability changes while the owner hint is unchanged
- **THEN** only the composer region is reconciled
- **AND** the hint node retains identity.
