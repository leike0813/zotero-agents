## ADDED Requirements

### Requirement: Debug and Maintenance SHALL expose typed Rust parity
The Rust application SHALL produce bounded JSON-safe snapshots and pages, return `superseded` rather than a mixed repository/canonical epoch, keep debug reads side-effect free, expose a pure diff, and delegate optional profiler and maintenance work through typed ports.

#### Scenario: Debug snapshot is read
- **WHEN** repository capture remains stable across bounded canonical inspection
- **THEN** Rust returns the same sorted bounded public snapshot as Node
- **AND** no SQLite, canonical, WebDAV, journal, or receipt state is modified
