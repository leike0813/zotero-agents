## ADDED Requirements

### Requirement: Rust CLI exposes library readiness queries

The CLI SHALL expose read-only `library readiness` commands for finding Zotero
items missing PDF attachments, same-stem source Markdown attachments, or
`literature-analysis` generated artifacts.

#### Scenario: Agent audits library readiness

- **WHEN** a user or agent runs
  `zotero-bridge library readiness audit --input <json-or-file>`
- **THEN** the CLI SHALL call the `library.readiness_audit` Host Bridge
  capability
- **AND** the input SHALL accept the same pagination and filter fields as
  `library snapshot`, plus `checks` and `missingOnly`.

#### Scenario: Agent lists missing artifacts

- **WHEN** a user or agent runs `library readiness missing-pdf`,
  `library readiness missing-markdown`, or `library readiness missing-analysis`
- **THEN** the CLI SHALL call `library.readiness_audit`
- **AND** it SHALL set the matching single check and `missingOnly: true`
- **AND** it SHALL preserve user-provided library filters, cursor, and limit.

#### Scenario: Readiness output remains a single JSON object

- **WHEN** a readiness CLI command succeeds or fails
- **THEN** stdout SHALL keep the standard single JSON object contract.
