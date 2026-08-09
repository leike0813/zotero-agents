## ADDED Requirements

### Requirement: Scoped Host Bridge approval SHALL remain attached to its invoking ACP owner

Host Bridge SHALL route a scoped write approval using the immutable scope of the invoking ACP adapter or run and SHALL NOT use owner identity later written by another owner.

#### Scenario: ACP Chat conversations share one profile

- **GIVEN** two ACP Chat conversations share stable Host Bridge profile configuration
- **WHEN** either conversation invokes a write after both adapters are connected
- **THEN** Host Bridge SHALL route the approval to the invoking conversation
- **AND** SHALL NOT fall back to another conversation or the global approval UI.

### Requirement: Host Bridge writes SHALL be presented as Zotero write approvals

Scoped Host Bridge write requests delivered to ACP Chat or ACP Skills SHALL carry the Zotero write approval kind.

#### Scenario: A scoped mutation requires approval

- **WHEN** a Host Bridge mutation reaches an ACP owner permission surface
- **THEN** the approval card SHALL use the Zotero write review presentation
- **AND** its original Host Bridge source identifier SHALL remain unchanged.
