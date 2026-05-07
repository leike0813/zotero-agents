# skillrunner-sidebar-host-runtime Specification

## Purpose
TBD - created by archiving change unify-assistant-run-archive-governance. Update Purpose after archive.
## Requirements
### Requirement: SkillRunner run archive marker

SkillRunner SHALL support archiving terminal request ledger records without deleting persisted diagnostics or run history.

Archived SkillRunner ledger records SHALL be hidden from the default managed Runs drawer.

SkillRunner `Cancel Run` SHALL remain a non-terminal run lifecycle action and SHALL NOT be used to archive terminal runs.

#### Scenario: Terminal SkillRunner run is archived

- **Given** a SkillRunner ledger record has terminal status
- **When** the user activates the Archive item action for that run
- **Then** the ledger record is marked with `archivedAt`
- **And** the record no longer appears in the default SkillRunner Runs drawer
- **And** no backend cancel request is sent.

