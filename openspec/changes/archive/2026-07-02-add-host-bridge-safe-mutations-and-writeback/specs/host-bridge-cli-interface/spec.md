## ADDED Requirements

### Requirement: CLI exposes canonical safe mutation commands

The `zotero-bridge` CLI SHALL expose canonical `mutation` commands for tag
add/remove, collection create/add/remove, item update, note create/update,
note payload upsert, and item attach-file. These commands SHALL construct
`mutation.preview` or `mutation.execute` payloads and preserve the single JSON
stdout contract.

#### Scenario: Semantic mutation command builds a mutation payload

- **WHEN** a caller runs a semantic mutation command
- **THEN** the CLI SHALL call the existing Host Bridge mutation capability
- **AND** the payload SHALL include the canonical operation name.

### Requirement: CLI supports inbound file upload

The CLI SHALL expose `file upload <path>` and SHALL upload bytes to
`POST /bridge/v1/files/upload`, returning the Host Bridge file descriptor as
a single JSON object.

#### Scenario: Upload output does not expose source path

- **WHEN** a caller uploads a local file
- **THEN** stdout SHALL include the broker-issued file descriptor
- **AND** SHALL NOT include the local source path unless supplied as the
  display name.

### Requirement: CLI exposes annotation read commands

The CLI SHALL expose `library annotation list` and `library annotation export`
as read-only commands.

#### Scenario: Annotation command uses read-only capability

- **WHEN** a caller runs an annotation command
- **THEN** the CLI SHALL call the corresponding read-only Host Bridge
  capability and SHALL NOT request mutation approval.
