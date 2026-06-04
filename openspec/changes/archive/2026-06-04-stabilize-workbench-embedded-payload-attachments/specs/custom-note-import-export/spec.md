## MODIFIED Requirements

### Requirement: export-notes MUST support custom note export
Custom and conversation markdown notes SHALL support v2 embedded payload storage while retaining legacy read compatibility.

#### Scenario: markdown note payload is v2-backed
- **WHEN** a package-managed custom or conversation markdown note is created or migrated
- **THEN** its markdown payload SHALL be stored as a v2 anchored embedded payload attachment
- **AND** export SHALL read that payload without requiring hidden HTML payload blocks.
