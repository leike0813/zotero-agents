## ADDED Requirements

### Requirement: Literature search ingest target collection uses dynamic options

The Literature Search Ingest workflow SHALL offer Zotero collection choices for
its target collection parameter.

#### Scenario: User configures target collection

- **WHEN** the workflow settings UI renders Literature Search Ingest
- **THEN** `targetCollection` SHALL use the `zotero.collections` dynamic option
  source
- **AND** the user SHALL see collection path labels
- **AND** the submitted value SHALL remain a collection ref string accepted by
  `ingest_papers`.
