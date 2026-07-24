## ADDED Requirements

### Requirement: ACP Skills Workspace restores an implicit foreground owner

When the ACP Skills Workspace resolves owner navigation or the selected owner and the explicit selection is empty or points at a removed or archived run, the store SHALL select the most recent non-archived run as an implicit selection through the same domain operation as an explicit selection, including its `selection` change emission. Direct reads of the explicit selection SSOT SHALL remain unchanged, and an explicit empty selection SHALL stay empty until the Workspace surface resolves an owner.

#### Scenario: First Workspace open selects the most recent run

- **GIVEN** ACP Skills has at least one non-archived run
- **AND** the current selection is empty after a restart
- **WHEN** the Assistant Workspace resolves the ACP Skills owner navigation or selected owner
- **THEN** the most recent non-archived run SHALL become the selected owner
- **AND** its transcript initialization SHALL proceed owner-first without a manual run or window switch.

#### Scenario: Live explicit selection is not overridden

- **GIVEN** the current selection points at an existing non-archived run
- **WHEN** the Workspace resolves the selected owner
- **THEN** the explicit selection SHALL be preserved.

#### Scenario: No runs leaves an empty selection

- **GIVEN** ACP Skills has no non-archived run
- **WHEN** the Workspace resolves the selected owner
- **THEN** the selection SHALL remain empty
- **AND** the initialization SHALL publish the unowned idle transcript.
