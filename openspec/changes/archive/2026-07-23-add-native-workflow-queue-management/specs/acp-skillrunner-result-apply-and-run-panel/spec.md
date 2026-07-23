## ADDED Requirements

### Requirement: ACP Skills task drawer SHALL expose Host-queued units as non-owner rows

The ACP Skills task drawer MUST render collapsible `Running`, `Queued`, and
`Completed` sections using one shared presentation contract. `Running` MUST be
expanded by default; `Queued` and `Completed` MUST be collapsed by default.
The `Queued` section MUST be hidden when empty, grouped by backend profile with
independently collapsible backend groups, and populated from the Host queue
read model rather than ACP task or transcript state.

#### Scenario: ACP queued units exist

- **WHEN** the ACP Skills drawer snapshot contains Host-queued units
- **THEN** the drawer SHALL render `Running`, `Queued`, and `Completed` in that order
- **AND** all three section headers SHALL toggle only their own local collapse state
- **AND** queued rows SHALL be grouped under their backend profiles
- **AND** the queued section SHALL be collapsed by default while its backend groups retain independent state
- **AND** the section titles, queued state, and cancel action SHALL use localized shared labels
- **AND** Running, Queued, and Completed SHALL use subtle theme-aware blue, amber, and neutral treatments respectively

#### Scenario: ACP queue is empty

- **WHEN** no ACP Host-queued units exist
- **THEN** the ACP Skills drawer SHALL omit the entire queued section

#### Scenario: User clicks an ACP queued row

- **WHEN** the user clicks the queued row body
- **THEN** the selected ACP run owner SHALL remain unchanged
- **AND** no transcript, details drawer, or foreground task SHALL be opened

#### Scenario: User cancels an ACP queued row

- **WHEN** the user activates the row's Material icon-only cancel action while the unit remains pending
- **THEN** the Host SHALL remove that unit from the queue
- **AND** the row SHALL disappear without creating an ACP task or archived history row

### Requirement: ACP backend Dashboard tabs SHALL expose cancellable queued rows

ACP backend-specific Dashboard views MUST merge Host-queued units into their
task table projection without representing them as ACP backend tasks. A queued
row MUST be visibly non-running, MUST have no open-details behavior, and MUST
offer the same pending-only cancel action as the task drawer.

#### Scenario: ACP backend tab is visible

- **WHEN** the selected Dashboard backend has Host-queued ACP units
- **THEN** those units SHALL appear in that backend's task list
- **AND** they SHALL NOT contribute a backend requestId, transcript link, or backend status action

#### Scenario: Queued row admission races with Dashboard cancellation

- **WHEN** the row has already been admitted before Dashboard handles its cancel action
- **THEN** the Dashboard SHALL refresh the queue projection
- **AND** it SHALL NOT issue ACP backend cancellation on behalf of that stale queued action
