## MODIFIED Requirements

### Requirement: Literature ingest maps to canonical mutation operation

The CLI SHALL execute literature ingest by calling the Host Bridge
`mutation.execute` capability with `operation: "literature.ingest"`.

#### Scenario: Ingest command is called

- **WHEN** `zotero-bridge literature ingest --input @payload.json` is invoked
- **THEN** the CLI SHALL submit the parsed single `paper` and optional
  `collection` inside a mutation execute payload
- **AND** the mutation operation SHALL be `literature.ingest`.

## ADDED Requirements

### Requirement: Literature ingest CLI supports missing-PDF landing URL attachment option

The literature ingest CLI payload SHALL preserve the optional
`paper.attachLandingUrlOnMissingPdf` field when wrapping input for
`mutation.execute`.

#### Scenario: Payload requests landing URL attachment

- **WHEN** the input payload contains `paper.attachLandingUrlOnMissingPdf: true`
- **THEN** the CLI SHALL forward that field unchanged to the Host Bridge
  `literature.ingest` mutation.
