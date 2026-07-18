## ADDED Requirements

### Requirement: WebDAV recovery remains explicit and non-destructive

WebDAV durable recovery SHALL validate and preview remote state before apply and
SHALL NOT overwrite canonical facts automatically when a conflict or invalid
payload is present.

#### Scenario: Remote recovery payload conflicts

- **WHEN** WebDAV recovery detects an invalid payload or an unsafe local/remote
  canonical conflict
- **THEN** it SHALL keep the local canonical state unchanged
- **AND** require an explicit supported recovery or conflict action.

