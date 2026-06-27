## MODIFIED Requirements

### Requirement: Diagnostic Bundle Export SHALL Follow RuntimeDiagnosticBundleV1 Schema

The system SHALL keep exporting developer diagnostics as a single JSON document `RuntimeDiagnosticBundleV1` for raw retained-log debugging.

#### Scenario: Export developer bundle baseline structure

- **WHEN** developer/raw diagnostic export is requested
- **THEN** the output JSON SHALL include `schemaVersion`, `meta`, `filters`, `timeline`, `incidents`, and `entries`
- **AND** `entries` SHALL preserve sanitized raw log rows for machine processing
- **AND** this raw retained-log export SHALL NOT be the default user-facing issue diagnostic bundle.
