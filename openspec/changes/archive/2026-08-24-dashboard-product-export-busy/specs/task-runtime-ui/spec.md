## MODIFIED Requirements

### Requirement: Dashboard Products export logical Product trees

Dashboard SHALL preview Product assets through the Product resolver, SHALL export a Product before opening it in the system file manager, and SHALL allow at most one normal Product export operation at a time within one Dashboard session.

#### Scenario: User exports a Product

- **WHEN** the user chooses Export Product and selects a destination directory
- **THEN** Dashboard SHALL reconstruct the Product beneath that directory using logical relative paths
- **AND** open the destination only after export succeeds
- **AND** SHALL never open the managed object directory as a Product tree.

#### Scenario: Product export enters a busy state

- **WHEN** the user starts a normal Product export from the Dashboard Products section
- **THEN** the Dashboard host SHALL reserve the single Product export slot before awaiting the destination picker
- **AND** the Products snapshot SHALL expose that a Product export is in progress
- **AND** the Export Product button SHALL be disabled and expose a busy state while the destination picker or export operation is active.

#### Scenario: Product export remains single-flight across selection changes

- **GIVEN** a normal Product export is in progress
- **WHEN** the user changes the selected Product or sends another normal Product export action
- **THEN** Dashboard SHALL NOT start a second Product export
- **AND** the existing busy state SHALL remain independent of the selected Product identifier.

#### Scenario: Product export restores its idle state

- **WHEN** the destination picker is canceled, the Product export succeeds, or the Product export fails
- **THEN** Dashboard SHALL release the single Product export slot
- **AND** the Products snapshot SHALL expose an idle export state
- **AND** the Export Product button SHALL become enabled again when a Product is selected.
