## MODIFIED Requirements

### Requirement: Tag vocabulary import uses merge preview on conflicts

Synthesis Tag Vocabulary SHALL import TagVocab-compatible payloads through an explicit preview and apply workflow.

#### Scenario: Preview is non-mutating

- **WHEN** a Workbench user previews an import payload
- **THEN** the preview SHALL expose additions, removals, and conflicts in the UI snapshot
- **AND** canonical tag vocabulary assets SHALL NOT change.

#### Scenario: Explicit import action commits

- **WHEN** the user applies `use-imported` or `merge-non-conflicting`
- **THEN** the service SHALL commit the resulting canonical vocabulary through the foundation transaction boundary
- **AND** a successful commit SHALL be eligible for Git Sync autosync.

#### Scenario: Conflicts are not silently replaced

- **WHEN** the preview contains conflicts and the user has not applied an explicit action
- **THEN** local canonical vocabulary SHALL remain unchanged.
