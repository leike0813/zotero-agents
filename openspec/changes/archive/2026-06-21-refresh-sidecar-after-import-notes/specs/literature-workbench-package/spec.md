## ADDED Requirements

### Requirement: Import-Notes SHALL refresh literature sidecars after standard generated-note import

The `import-notes` workflow SHALL trigger the literature digest sidecar apply pipeline after it imports at least one standard generated note kind: `digest`, `references`, or `citation-analysis`.

#### Scenario: Importing a complete standard artifact set refreshes sidecar

- **WHEN** `import-notes` imports digest, references, and citation-analysis artifacts for a parent item
- **THEN** it SHALL call the literature digest sidecar apply host API for that parent item
- **AND** the sidecar source workflow SHALL identify `import-notes`.

#### Scenario: Importing a partial standard artifact set refreshes sidecar with only selected artifacts

- **WHEN** `import-notes` imports only a subset of digest, references, and citation-analysis artifacts
- **THEN** it SHALL call the literature digest sidecar apply host API
- **AND** it SHALL include only the imported standard artifact inputs
- **AND** it SHALL NOT fabricate missing sibling artifact payloads.

#### Scenario: Importing only custom notes does not refresh sidecar

- **WHEN** `import-notes` imports custom markdown notes without any standard generated note artifact
- **THEN** it SHALL NOT call the literature digest sidecar apply host API.
