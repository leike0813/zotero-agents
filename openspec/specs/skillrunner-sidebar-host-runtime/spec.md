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

### Requirement: SkillRunner Details metadata boundary

SkillRunner Details SHALL show current run/task metadata and compact diagnostics summaries.

SkillRunner Details SHALL expose a `Copy ID` action for the current run when a request id is available.

SkillRunner Details SHALL NOT render full conversation history, full transcript message lists, or full raw envelope dumps in the visible drawer body.

Full SkillRunner diagnostics MAY remain available through diagnostic copy/export actions.

#### Scenario: SkillRunner Details omits full conversation history

- **Given** a SkillRunner run has many chat messages
- **When** the Details drawer is rendered
- **Then** the drawer shows run metadata and compact summaries
- **And** it does not render the full message list or full raw envelope dump.

