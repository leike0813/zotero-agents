## ADDED Requirements

### Requirement: Transfer staging SHALL preserve Synthesis ownership boundaries
Only the designated service transfer owner and server dispatch MAY use Node filesystem staging. Transfer and worker modules SHALL NOT import production repository, canonical-file, Host capability, Zotero global, or child-process code.

#### Scenario: Static boundaries are checked
- **WHEN** Synthesis dependency guards run
- **THEN** transfer files are restricted to their approved imports and existing worker restrictions remain enforced

#### Scenario: Migration inventory is checked
- **WHEN** service migration governance runs
- **THEN** it still reports eight engines, `108 methods / 1 direct consumer`, `mutationEnabled: false`, and Citation Graph Build `production_worker: false`

### Requirement: Transfer staging SHALL not become production state
Staged manifests and pages SHALL be ephemeral runtime data and SHALL NOT update the Synthesis database, canonical files, cache basis, operations, or last-good graph.

#### Scenario: Transfer fails or expires
- **WHEN** a session is invalid, canceled, expired, or lost on restart
- **THEN** production graph and cache basis remain unchanged
