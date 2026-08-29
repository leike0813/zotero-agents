## ADDED Requirements

### Requirement: SQLite access is confined to the service main process adapter
Static boundaries SHALL allow `node:sqlite` only in the designated sidecar repository adapter and SHALL forbid it from workers and the environment-neutral package. Existing prohibitions on plugin production repository imports, canonical files, Host capabilities, Zotero globals, and subprocesses SHALL continue to apply to the service repository path.

#### Scenario: Boundary checker rejects misplaced SQLite access
- **WHEN** a worker, shared foundation file, or non-designated service file imports `node:sqlite`
- **THEN** the service boundary check fails
