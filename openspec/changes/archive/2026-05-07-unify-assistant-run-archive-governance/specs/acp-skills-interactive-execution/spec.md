# acp-skills-interactive-execution Delta

## ADDED Requirements

### Requirement: ACP Skills run archive marker

ACP Skills SHALL support archiving terminal runs without deleting persisted run diagnostics, logs, workspace artifacts, result artifacts, or transcript records.

Archived runs SHALL be hidden from the default ACP Skills Runs drawer and selected-run snapshot.

ACP Skills `Cancel Run` SHALL remain a non-terminal run lifecycle action and SHALL NOT be used to archive terminal runs.

#### Scenario: Terminal ACP Skills run is archived

- **Given** an ACP Skills run has terminal status
- **When** the user activates the Archive item action for that run
- **Then** the run record is marked with `archivedAt`
- **And** the run no longer appears in default ACP Skills panel snapshots
- **And** the run record and diagnostics remain persisted.
