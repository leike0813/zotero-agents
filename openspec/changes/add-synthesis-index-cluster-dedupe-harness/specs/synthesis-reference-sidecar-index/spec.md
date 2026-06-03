## ADDED Requirements

### Requirement: External index harness reads current sidecar and Zotero facts
The Synthesis Index harness SHALL read current Zotero library facts from Zotero
SQLite and current sidecar/reference facts from the Synthesis plugin SQLite
database.

#### Scenario: Snapshot is generated
- **WHEN** the harness creates a snapshot
- **THEN** library item titles SHALL come from Zotero SQLite
- **AND** raw/canonical/binding/proposal facts SHALL come from active sidecar
  tables.
- **AND** canonical dedupe inputs SHALL aggregate active raw references through
  effective canonical redirects
- **AND** they SHALL include title candidates from effective canonical rows,
  physical canonical rows, and raw parsed references.
- **AND** cluster result read models SHALL expose canonical eligibility and
  filter reasons for diagnostics.

#### Scenario: Legacy registry tables exist
- **WHEN** old registry/projection tables exist in a database
- **THEN** the harness SHALL NOT read them as an active data source.
