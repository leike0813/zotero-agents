## ADDED Requirements

### Requirement: Literature ingest maps directly to its canonical capability
The CLI SHALL execute literature ingest through the typed `literature.ingest` capability, with optional `--dry-run` and caller operation id, without wrapping the payload in the public `mutation.execute` union.

#### Scenario: Ingest command is called
- **WHEN** `zotero-bridge literature ingest` is invoked
- **THEN** it submits the operation-specific literature ingest input
- **AND** the capability identity is `literature.ingest`.
