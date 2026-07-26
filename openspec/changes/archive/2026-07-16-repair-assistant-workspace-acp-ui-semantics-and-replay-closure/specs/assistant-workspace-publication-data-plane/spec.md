## MODIFIED Requirements

### Requirement: Workspace publication uses one strict v6 registry

ACP Chat and ACP Skills SHALL use the v6 region and presentation registries as
the sole source of publication kind, payload, semantic presentation fields,
browser key, managed region, and source support. v5 publications, generic
banner arrays, producer labels, presentation tasks, aliases, and dual writes
SHALL be rejected.

#### Scenario: A v5 presentation reaches the child

- **WHEN** a publication uses the v5 schema or a removed presentation field
- **THEN** the receiver rejects it as invalid
- **AND** canonical state and DOM remain unchanged.

### Requirement: ACP action scope is exact

Every shared ACP action SHALL be classified as local, target-owner,
selected-owner, navigation-group, or global. Target identity SHALL be present
only in the action owner envelope.

#### Scenario: A user selects another task

- **WHEN** a drawer card for a non-selected Skills owner is activated
- **THEN** the clicked owner is sent in the action envelope
- **AND** the current selected owner does not replace it.

### Requirement: Transcript delta application is transactional

The child and transcript renderer SHALL commit canonical state, virtual page
state, node maps, signatures, and DOM only after the complete transcript effect
succeeds.

#### Scenario: A structural delta render fails

- **WHEN** row reconciliation cannot complete
- **THEN** no partial renderer state becomes committed
- **AND** the same signature can be retried from the previous committed state.
