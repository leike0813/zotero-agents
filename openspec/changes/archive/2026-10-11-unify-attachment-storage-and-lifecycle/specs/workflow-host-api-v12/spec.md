## ADDED Requirements

### Requirement: Workflow attachment preparation SHALL preserve common lifecycle behavior
Workflow and research-bundle stored attachment creation and replacement SHALL follow the attachment-file-lifecycle contract, including private preparation, portable naming, complete-set validation, and cleanup. Public v12 members and request shapes SHALL remain unchanged.

#### Scenario: Two ingress forms provide equivalent content
- **WHEN** a local-path workflow and a research resource provide equivalent stored content
- **THEN** both enforce the same naming, companion validation, and permanent-storage guarantees

### Requirement: Stored replacement SHALL update native file synchronization
Changed stored attachment sets SHALL mark native upload state and update main-file modification time so native remote comparison observes companion-only changes. Last-synchronized conflict evidence SHALL be retained. Unchanged content SHALL preserve timestamps and sync state.

#### Scenario: Two replacements occur within one second
- **WHEN** two changed companion sets are saved during one clock second
- **THEN** their main-file times remain distinguishable by native second-precision comparison without forcing remote overwrite

#### Scenario: Metadata save fails during replacement
- **WHEN** the replacement cannot commit its metadata and sync state
- **THEN** rollback restores the old file set and the old synchronization state
