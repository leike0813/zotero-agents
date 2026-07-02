## MODIFIED Requirements

### Requirement: Zotero Librarian profile is generated from semantic sources

The Zotero Librarian profile SHALL keep semantic source files and generated profile files aligned through renderer and governance checks.

#### Scenario: Profile semantic guidance is current-state only

- **WHEN** Host Bridge workflow operation profile guidance is added or rendered
- **THEN** governance checks SHALL include both source and generated guidance in current-state-only validation
- **AND** shared terminology SHALL match the rendered profile terminology reference exactly.
