## MODIFIED Requirements

### Requirement: Reference Sidecar Index is a Zotero-plus-sidecar read view

Reference Sidecar Index UI and APIs SHALL read current Zotero Library facts directly and join Synthesis sidecar rows for artifact, reference, canonical, binding, and diagnostic cache state. Workbench reads SHALL be page bounded and sidecar fact reads SHALL be scoped to the displayed or explicitly expanded source refs.

#### Scenario: Current item has no sidecar row

- **WHEN** a current Zotero item has not yet been refreshed into the Reference Sidecar
- **THEN** the Index still displays the Zotero item
- **AND** its artifact coverage is `missing`

#### Scenario: Refreshed item is displayed

- **WHEN** Reference Refresh commits artifact and reference facts for a current Zotero item
- **THEN** the Index displays its derived coverage and reference counts
- **AND** expanding that source loads only its bounded reference details

### Requirement: Reference Sidecar readiness SHALL be cache-basis owned

Reference Sidecar UI readiness SHALL be projected from the `reference-sidecar:library` cache-basis row and SHALL NOT be inferred from Index row count.

#### Scenario: Non-empty library refresh succeeds

- **WHEN** Reference Refresh commits `status=ready`
- **THEN** Workbench displays Reference Sidecar status `ready`
- **AND** an ordinary UI refresh preserves that status

#### Scenario: Empty library refresh succeeds

- **WHEN** a full refresh of an empty current library commits `status=ready`
- **THEN** Workbench displays `ready` with an empty Index
- **AND** it does not downgrade readiness to `missing`
