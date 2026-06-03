## ADDED Requirements

### Requirement: Harness writes only isolated debug persistence
The Synthesis Index harness SHALL write algorithm run output only to an
explicit debug SQLite database.

#### Scenario: Debug database path overlaps real databases
- **WHEN** the requested debug database path equals the Zotero database path or
  the plugin database path
- **THEN** the harness SHALL reject the command before running algorithm work.

#### Scenario: Cluster run completes
- **WHEN** a cluster dedupe run completes
- **THEN** the real Zotero and plugin databases SHALL remain unmodified
- **AND** the debug database SHALL contain the run metadata, clusters, edges,
  actions, counters, and diagnostics.

#### Scenario: Low-quality canonical records are filtered
- **WHEN** a cluster run encounters excluded canonical records
- **THEN** those records SHALL be reported through counters or diagnostics
- **AND** they SHALL NOT expand candidate blocks or pair comparisons.
