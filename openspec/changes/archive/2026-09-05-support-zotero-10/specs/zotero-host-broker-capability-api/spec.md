## ADDED Requirements

### Requirement: Current view scalar selection SHALL be unambiguous

The broker SHALL read the host's plural library-tree selection when available, retain legacy selection access only as a fallback when the plural API is unavailable, and expose scalar current-view fields only when the selection resolves to one unambiguous value.

#### Scenario: One library is selected
- **WHEN** the current library-tree selection resolves to exactly one library id
- **THEN** `hostApi.context.getCurrentView()` SHALL include that library id

#### Scenario: Multiple libraries are selected
- **WHEN** the current library-tree selection resolves to more than one distinct library id
- **THEN** `hostApi.context.getCurrentView()` SHALL omit the scalar library id

#### Scenario: One real collection is selected
- **WHEN** exactly one selected library-tree row represents a real Zotero collection
- **THEN** `hostApi.context.getCurrentView()` SHALL include the normalized current collection

#### Scenario: Multiple or non-collection rows are selected
- **WHEN** multiple library-tree rows are selected or the selected row is not a real collection
- **THEN** `hostApi.context.getCurrentView()` SHALL omit the scalar current collection

#### Scenario: Plural selection API is unavailable
- **WHEN** the host does not provide the plural library-tree selection API
- **THEN** the broker SHALL use the legacy single-selection API without changing the public DTO shape
