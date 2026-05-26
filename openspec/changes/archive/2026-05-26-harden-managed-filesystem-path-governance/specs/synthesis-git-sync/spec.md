## ADDED Requirements

### Requirement: Git Sync import validates canonical assets

Git Sync SHALL validate imported canonical assets before promotion into the
local canonical store.

#### Scenario: Import path violates managed policy

- **WHEN** an import snapshot contains an asset path with traversal, an absolute
  path form, reserved name, unsafe segment, or over-budget managed relative path
- **THEN** validation SHALL fail before promotion
- **AND** the local canonical store SHALL remain unchanged.
