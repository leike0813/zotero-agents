## ADDED Requirements

### Requirement: Chat steady publication is mutation proportional
ACP Chat SHALL obtain the active owner without frontend snapshot materialization and SHALL publish message counts from the shared count snapshot. Steady transcript publication SHALL use producer-native shared mutations and SHALL perform zero transcript-page, frontend, or panel materialization.

#### Scenario: Boundary assistant message completes
- **WHEN** held assistant text reaches a hard boundary
- **THEN** Chat releases the shared mutation batch without reading the complete page
- **AND** forbidden materialization counts remain zero.

### Requirement: Chat formal publication budget is enforced
For the accepted boundary trace, Chat actual posted bytes per formal round SHALL be below 2.7 MB, steady transcript snapshots SHALL be zero outside explicit lifecycle/rebase causes, and transcript bytes SHALL grow with new mutations rather than accumulated history.

#### Scenario: Formal Chat replay completes
- **WHEN** all formal runs share trace digest, cadence, and user-selected boundary mode
- **THEN** the report passes the byte, materialization, identity, and lifecycle budgets.
