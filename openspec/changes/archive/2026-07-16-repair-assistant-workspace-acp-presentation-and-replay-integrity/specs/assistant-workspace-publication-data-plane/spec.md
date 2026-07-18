## MODIFIED Requirements

### Requirement: Workspace publication uses one strict v5 registry

ACP Chat and ACP Skills SHALL use the v5 region registry as the sole source of
publication kind, scope, form, payload, browser key, managed region, and source
support. v4 publications, unknown fields, aliases, and dual writes SHALL be
rejected.

#### Scenario: A legacy publication reaches the child

- **WHEN** a publication uses the v4 schema or a removed region kind
- **THEN** the receiver rejects it as invalid
- **AND** canonical state and DOM remain unchanged.

### Requirement: Owner selection replaces the complete owned state

The canonical child state SHALL contain one `selection` object for the selected
owner. Applying owner navigation with a different owner SHALL atomically replace
that selection with the new owner's empty loading state.

#### Scenario: Skills switches runs

- **WHEN** owner navigation selects another request
- **THEN** no control, count, transcript, plan, permission, composer, or
  presentation field from the previous request remains visible.

### Requirement: Publication identity is not duplicated

The publication wrapper SHALL NOT duplicate source tab identity, transcript page
requests SHALL contain only owner plus page request, and Replay barriers SHALL
contain only source, publication id, and delivery sequence.

#### Scenario: Chat requests a historical page

- **WHEN** the child requests a cursor
- **THEN** backend and conversation identity exist only in the canonical owner
- **AND** no request-id or active-conversation alias is accepted.
