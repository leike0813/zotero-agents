## ADDED Requirements

### Requirement: Message counter preserves managed-region identity

Assistant message counts SHALL be rendered only by the message-counter managed region. Its owner, category values, activity, completeness, and revision SHALL NOT enter transcript, toolbar, banner, plan, hint, reply, context drawer, details drawer, or permission drawer render signatures.

#### Scenario: count-only update is region-local

- **WHEN** one selected-owner semantic count advances without another visible change
- **THEN** only the message-counter region is eligible to update
- **AND** transcript and all other managed-region nodes retain identity and interactive state.

#### Scenario: owner-first rendering does not wait for transcript hydration

- **WHEN** a selected owner changes and persisted count metadata is available
- **THEN** the message counter may render from owner metadata independently
- **AND** indexed page read and full mirror hydration remain separate transcript operations.

#### Scenario: child panel guard does not swallow count-only snapshots

- **WHEN** a child panel receives a snapshot whose only visible change is message-count state
- **THEN** the snapshot reaches the shared message-counter region guard
- **AND** unchanged toolbar, banner, transcript, reply, and drawer regions retain DOM identity.

## REMOVED Requirements

### Requirement: Silent progress preserves managed-region identity

**Reason**: Progress is no longer a silent-only transcript concern.

**Migration**: Replace the transcript progress signature with an independent message-counter managed-region signature.
