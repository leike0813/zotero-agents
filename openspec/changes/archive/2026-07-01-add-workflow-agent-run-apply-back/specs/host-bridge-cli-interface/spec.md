## MODIFIED Requirements

### Requirement: Rust CLI exposes workflow agent-run apply-back

The CLI SHALL expose both agent-owned workflow handoff and explicit apply-back
while preserving single JSON stdout.

#### Scenario: CLI prepares an agent-run handoff with apply metadata

- **WHEN** a user or agent runs `zotero-bridge workflow agent-run`
- **THEN** stdout SHALL include `agentRunId`, `expiresAt`, `requests`, and bundle
  download metadata when `--output-dir` is used.

#### Scenario: CLI submits agent-run apply-back

- **WHEN** a user or agent runs
  `zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`
- **THEN** the CLI SHALL call the Host Bridge apply-back endpoint with a local
  path bundle reference
- **AND** multiple `--result` values SHALL map to multiple result entries
- **AND** invalid result arguments SHALL produce structured CLI validation errors.
