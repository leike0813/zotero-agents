## MODIFIED Requirements

### Requirement: Synthesis Workbench review center is domain complete

The Review page SHALL show the active review records for each selected review
domain without requiring the user to inspect another tab.

#### Scenario: Reference matching rows expose manual target selection

- **WHEN** an open Reference Matching proposal is shown in the Index review table
- **THEN** the actions SHALL include `Manual target`
- **AND** opening it SHALL show a bounded scrollable target picker with `#` and
  `A-Z` navigation
- **AND** choosing a target SHALL create a pending manual target decision without
  immediately writing storage.

#### Scenario: Index review drawer exposes manual target selection

- **WHEN** an open Reference Matching proposal is shown in the Index review drawer
- **THEN** the card actions SHALL include `Manual target`
- **AND** the picker SHALL use the same target candidates and pending decision
  flow as the Review page table.
