## MODIFIED Requirements

### Requirement: Waiting-user regions are independently signature-guarded

Toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, and file-interaction regions SHALL each use stable signatures limited to their visible content and open/collapsed state. Transcript revisions, pages, chunks, counts, loading state, prompting tails, and log tails SHALL NOT enter those signatures.

#### Scenario: Transcript-only snapshot arrives during waiting-user state

- **WHEN** the selected owner's transcript changes but waiting-user content does not
- **THEN** only the transcript region SHALL render
- **AND** all non-transcript managed-region DOM identities SHALL be preserved

#### Scenario: Interaction hint changes

- **WHEN** only a visible interaction hint changes
- **THEN** only the hint region SHALL update
- **AND** reply and transcript DOM identities SHALL be preserved
