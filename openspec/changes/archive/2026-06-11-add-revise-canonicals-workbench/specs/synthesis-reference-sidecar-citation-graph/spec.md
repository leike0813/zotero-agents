## ADDED Requirements

### Requirement: Canonical workbench commands SHALL enforce safe canonical boundaries

Revise Canonicals service commands SHALL validate canonical safety before writing redirects, metadata updates, or archive state.

#### Scenario: User applies pending canonical merges

- **WHEN** pending merge requests are applied
- **THEN** the service SHALL validate source and target effective canonicals
- **AND** SHALL reject self merges, redirect cycles, missing canonicals, and unsafe conflicting Zotero bindings
- **AND** successful requests SHALL create accepted canonical revision merge proposals and canonical redirects.

#### Scenario: User edits metadata

- **WHEN** metadata edit is requested for a canonical row
- **THEN** the service SHALL allow edits only for unbound external canonicals
- **AND** SHALL derive normalized title from the submitted title
- **AND** SHALL mark citation graph and related-item projections stale or cascade active graph display metadata as implemented.

#### Scenario: User archives a canonical

- **WHEN** archive is requested
- **THEN** the service SHALL refuse rows with active raw references, bindings, redirects, related proposals, or graph participation
- **AND** SHALL avoid hard deletion.
