## MODIFIED Requirements

### Requirement: Dashboard Products export logical Product trees

Dashboard SHALL preview Product assets through the Product resolver and SHALL export a Product before opening it in the system file manager.

#### Scenario: User exports a Product

- **WHEN** the user chooses Export Product and selects a destination directory
- **THEN** Dashboard SHALL reconstruct the Product beneath that directory using logical relative paths
- **AND** open the destination only after export succeeds
- **AND** SHALL never open the managed object directory as a Product tree.
