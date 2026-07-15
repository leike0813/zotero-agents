## ADDED Requirements

### Requirement: Skills uses the shared transcript region and domain mapping
ACP Skills SHALL publish transcript through the shared transcript region, progress as shared message counts, and runtime options as shared reply state. Run, selection, archive, and global changes SHALL use explicit structural mappings. Skills SHALL NOT expose a selected-run-specific transcript lifecycle or page field to Workspace.

#### Scenario: Selected run transcript changes
- **WHEN** the selected request emits a UI-visible transcript mutation
- **THEN** Skills passes the normalized mutation through the same projection and coordinator as Chat.

### Requirement: Skills Replay releases production hard boundaries
Workflow Replay turn-end, root-end, and request terminal events SHALL invoke the same hard-boundary release seam used by production Skills execution. Text held in boundary mode SHALL become visible exactly once at the semantic boundary.

#### Scenario: Text-only replay turn ends
- **WHEN** a turn contains assistant text chunks and no structural update
- **THEN** turn-end releases the text into a transcript delta
- **AND** the rendered Skills transcript remains visible until cleanup.

### Requirement: Skills storage remains unchanged
Publication migration SHALL NOT alter run persistence, transcript JSONL/index, recovery, archive, workflow behavior, or request-id ownership. Store-specific fields SHALL be normalized at the adapter boundary.

#### Scenario: Recovered run is selected
- **WHEN** a persisted run is restored and selected
- **THEN** its indexed page is normalized to the same shared region used by live execution.
