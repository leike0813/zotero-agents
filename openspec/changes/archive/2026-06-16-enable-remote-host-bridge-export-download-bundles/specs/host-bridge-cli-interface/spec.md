## ADDED Requirements

### Requirement: CLI forwards profile connection mode

The Host Bridge CLI SHALL preserve the active profile `connectionMode` value and
SHALL send it to Host Bridge for authenticated requests.

#### Scenario: Remote profile calls a capability
- **WHEN** the active CLI profile declares `connectionMode: "remote"`
- **AND** the CLI sends an authenticated request such as `manifest`, `call`, or
  `file download`
- **THEN** the HTTP request SHALL include
  `X-Zotero-Bridge-Connection-Mode: remote`.

#### Scenario: Header is absent
- **WHEN** a Host Bridge request does not include
  `X-Zotero-Bridge-Connection-Mode`
- **THEN** the server SHALL treat the request as `local`
- **AND** existing clients SHALL keep their local file-output behavior.

### Requirement: Remote export bundle delivery guidance

The Host Bridge CLI documentation and wrapper skill SHALL instruct agents to use
Host Bridge file download when a response contains `delivery.mode:
"bridge-download"`.

#### Scenario: Agent receives a bridge-download delivery
- **WHEN** a CLI response contains `delivery.mode: "bridge-download"`
- **THEN** the response SHALL include a `delivery.bundle.fileId`
- **AND** the response SHALL include a complete `delivery.downloadCommand`
- **AND** the response SHALL include a complete `delivery.unpackHint`
- **AND** docs SHALL instruct the agent to run the download command before
  reading files from the unpacked bundle.
