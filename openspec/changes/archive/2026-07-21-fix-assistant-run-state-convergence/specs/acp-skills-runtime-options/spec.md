## MODIFIED Requirements

### Requirement: ACP Skills runtime selections SHALL belong to the active catalogs

ACP Skills SHALL validate submitted, persisted, session-reconciled, and runtime-edited mode, display model, raw model, and reasoning selections against the selected backend or live session catalogs before persistence or transport. Legal explicit selections SHALL beat a different observed current; illegal selections SHALL use a legal observed current or remain unset. Catalog order alone SHALL NOT create a current selection.

#### Scenario: Old backend mode reaches a new backend

- **GIVEN** backend A selected `code`
- **AND** backend B exposes only `ask` and `build` with current `build`
- **WHEN** a run is submitted to backend B without editing mode
- **THEN** the run and mode setter use `build`
- **AND** `code` is never persisted or transported for backend B.

#### Scenario: Live catalog differs from submission cache

- **WHEN** a submitted selection is absent from the new session catalog
- **THEN** ACP Skills atomically replaces it with the legal observed current or clears it
- **AND** no invalid setter call is attempted.

#### Scenario: Runtime action names an unknown option

- **WHEN** a run-scoped mode, model, or reasoning action names a value outside its live catalog
- **THEN** the action is rejected before transport
- **AND** the persisted run-effective selection remains unchanged.
