## ADDED Requirements

### Requirement: Note mutations SHALL be confirmed and revision-aware
Note creation, content update, removal, and payload upsert SHALL validate portable refs and expected revisions, execute through canonical mutation admission, and return current normalized note or payload state with a confirmed receipt or structured attempt.

#### Scenario: Note content revision conflicts
- **WHEN** a note content update supplies an expected revision that no longer matches
- **THEN** the mutation returns a conflict before changing content or embedded resources

### Requirement: Embedded image writes SHALL preserve one content boundary
Prepared note images and note content changes SHALL validate all image inputs and managed destinations before the note mutation boundary. If a later resource write fails, the operation SHALL compensate or return `unknown`/`repair_required` with the original failure retained as primary.

#### Scenario: Image copy fails after note creation
- **WHEN** an accepted note mutation creates state but an embedded image cannot be finalized
- **THEN** cleanup is attempted and the returned attempt reports any remaining note or resource state without claiming committed success

### Requirement: Note payload diagnostics SHALL be closed
Note payload listing and reads SHALL expose only the declared payload provenance, health, and value variants. Native file errors and open warning bags MUST NOT enter the public result.

#### Scenario: Payload storage is missing
- **WHEN** a declared note payload has no readable backing value
- **THEN** its public health state uses the closed diagnostic union and does not expose a local path or native exception
