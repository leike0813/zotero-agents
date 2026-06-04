## ADDED Requirements

### Requirement: Synthesis layer documentation SHALL describe artifact payload storage truthfully
Active documentation SHALL describe v2 anchored embedded payload storage and the Synthesis artifact availability boundary.

#### Scenario: Documentation mentions artifact availability
- **WHEN** active Synthesis docs describe artifact existence
- **THEN** they SHALL state that parseable embedded payload attachments are the artifact availability source
- **AND** hidden payload blocks or note-only presence are legacy/migration diagnostics only.
