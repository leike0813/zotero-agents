## ADDED Requirements

### Requirement: Tags import wizard previews TagVocab payloads

The Synthesis Workbench Tags import wizard SHALL accept Zotero TagVocab `tags/tags.json` payloads and show a meaningful preview before any canonical write.

#### Scenario: User previews TagVocab JSON

- **WHEN** the user pastes a JSON object with top-level `tags`
- **THEN** the Workbench SHALL route it to the Synthesis import preview command
- **AND** the returned snapshot SHALL show additions, unchanged entries, conflicts, or validation warnings instead of an empty item list.

#### Scenario: User applies import explicitly

- **WHEN** the user applies `merge-non-conflicting` or `use-imported`
- **THEN** the Workbench SHALL route the selected action and original payload to the Synthesis import apply command
- **AND** it SHALL rely on the service transaction result to refresh the snapshot.
