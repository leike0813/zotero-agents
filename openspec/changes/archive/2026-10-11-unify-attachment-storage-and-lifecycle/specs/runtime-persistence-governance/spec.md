## ADDED Requirements

### Requirement: Temporary cleanup SHALL respect active attachment ownership
Runtime temporary-category cleanup SHALL refuse deletion while attachment preparation, stored mutation, or an upload lease owns temporary content, and SHALL report the in-use state. Cleanup admission and acquisition SHALL not race into deletion of active input.

#### Scenario: Cleanup races with an attachment import
- **WHEN** temporary cleanup is requested while an attachment preparation scope or upload lease is active
- **THEN** cleanup reports that the category is in use and does not remove its files

#### Scenario: No attachment work owns temporary content
- **WHEN** temporary cleanup is requested after all attachment scopes and leases have been released
- **THEN** existing temporary-category cleanup remains available
