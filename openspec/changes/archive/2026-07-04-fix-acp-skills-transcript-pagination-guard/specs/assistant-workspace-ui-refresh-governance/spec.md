## ADDED Requirements

### Requirement: ACP Skills workspace refreshes are request scoped

Assistant Workspace SHALL use ACP Skills change descriptors to avoid rebuilding or posting ACP Skills snapshots for changes that are known to be unrelated to the selected ACP Skills run.

#### Scenario: Unrelated background transcript does not rebuild inactive ACP Skills panel

- **GIVEN** Assistant Workspace is open on a tab other than ACP Skills
- **WHEN** a non-selected ACP Skills run emits a transcript-only change descriptor
- **THEN** the workspace host SHALL NOT rebuild or post an ACP Skills panel snapshot for that change
- **AND** toast and attention indicator work SHALL also be skipped when the descriptor is known to be transcript-only.

#### Scenario: Selected transcript change refreshes active ACP Skills panel

- **GIVEN** Assistant Workspace is open on the ACP Skills tab
- **AND** request `A` is the selected ACP Skills run
- **WHEN** request `A` emits a transcript or runtime-options change descriptor
- **THEN** the workspace host SHALL refresh the ACP Skills panel snapshot.

#### Scenario: Unknown changes remain conservative

- **WHEN** an ACP Skills store change has no descriptor or is marked global
- **THEN** the workspace host SHALL use the existing conservative refresh behavior.

### Requirement: ACP Skills snapshots are signature guarded

Assistant Workspace SHALL avoid posting ACP Skills child snapshots when the bounded snapshot content is unchanged.

#### Scenario: Repeated unchanged snapshot is skipped

- **GIVEN** the host has posted an ACP Skills snapshot with signature `S`
- **WHEN** a later ordinary store-change refresh produces the same signature `S`
- **THEN** the host SHALL skip posting that child snapshot.

#### Scenario: Init and user actions force snapshot delivery

- **WHEN** ACP Skills is initialized, activated by tab selection, or refreshed after a user child action
- **THEN** the host SHALL deliver the ACP Skills snapshot even if its content signature matches the previous snapshot.
