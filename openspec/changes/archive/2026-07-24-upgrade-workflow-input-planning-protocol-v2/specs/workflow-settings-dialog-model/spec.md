## ADDED Requirements

### Requirement: Workflow settings preview SHALL represent prepared units
The settings dialog preview SHALL render one row per top-level prepared unit using safe unit labels and member counts rather than raw candidate or selection payloads.

#### Scenario: Parent grouping preview
- **WHEN** candidate planning produces three parent groups
- **THEN** the preview displays three unit rows in prepared order

### Requirement: Concurrency controls SHALL depend on unit count
The left unit list and maximum-concurrency control SHALL be shown only when the confirmed preview contains more than one top-level unit.

#### Scenario: All grouping has many members
- **WHEN** all grouping produces one unit containing multiple members
- **THEN** the dialog hides the multi-unit list and concurrency control
