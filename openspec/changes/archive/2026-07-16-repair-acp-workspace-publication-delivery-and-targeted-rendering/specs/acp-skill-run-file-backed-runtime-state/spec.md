## ADDED Requirements

### Requirement: Skills transcript delivery and rendering matches Chat

ACP Skills SHALL use the same generation-scoped Shell retention, shared child FIFO, item mutation model, render effects, terminal acknowledgement, and rebase decisions as ACP Chat. Skills SHALL NOT retain a surface-specific transcript publication or full-page render state machine.

#### Scenario: Equivalent Chat and Skills updates are normalized

- **WHEN** equivalent visible item sequences are applied to Chat and Skills
- **THEN** their normalized publication form, mutation operation, revision transition, render effect, and acknowledgement decision are identical apart from owner and item content
- **AND** neither surface rebuilds unaffected rows.
