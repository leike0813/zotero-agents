## ADDED Requirements

### Requirement: Workflow parameters may declare dynamic option sources

Workflow manifests SHALL support `parameters.<key>.optionsSource` for string
parameters that request host-resolved option candidates.

#### Scenario: Manifest declares collection options

- **WHEN** a workflow parameter declares `optionsSource.kind` as
  `zotero.collections`
- **THEN** the manifest SHALL load successfully
- **AND** the parameter SHALL remain a string parameter.

#### Scenario: Source kind is unknown

- **WHEN** a workflow parameter declares an unknown `optionsSource.kind`
- **THEN** the manifest SHALL still load
- **AND** option resolution SHALL report a recoverable diagnostic instead of
  failing the workflow.

### Requirement: Dynamic options separate label from submitted value

Resolved dynamic options SHALL expose a submitted `value` and a user-visible
`label`.

#### Scenario: Zotero collection option is rendered

- **WHEN** the dynamic source returns a Zotero collection
- **THEN** the submitted value SHALL be a stable collection ref
- **AND** the visible label SHALL be the collection path, not the raw
  collection key.
