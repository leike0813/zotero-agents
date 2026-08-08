## ADDED Requirements

### Requirement: CLI workflow commands expose resource bindings
The canonical `workflow validate` and `workflow submit` commands SHALL expose repeatable input-resource bindings in the form `<slot>=<fileId>` and output-resource delivery bindings in the form `<slot>=bridge-download`. Their offline schemas, help, command cards, payload composition, and result schemas SHALL use the same field names and SHALL not expose file-picker or client-path parameters.

#### Scenario: CLI binds an uploaded input
- **WHEN** an agent invokes `workflow submit --input-resource source=file-123`
- **THEN** the CLI SHALL send `resourceBindings.inputs.source.fileIds = ["file-123"]`
- **AND** it SHALL not send the local path used by the preceding upload command

#### Scenario: Multiple files bind to one slot
- **WHEN** an agent repeats `--input-resource notes=file-1 --input-resource notes=file-2`
- **THEN** the CLI SHALL preserve both opaque handles in binding order

### Requirement: CLI exposes resource delivery results
The CLI workflow result contract SHALL expose resource output descriptors and safe continuation guidance through the existing `file download` command. It SHALL not print Host-local paths or silently open GUI interaction.

#### Scenario: Workflow returns a downloadable output
- **WHEN** a remote workflow completes with an output resource
- **THEN** the CLI SHALL return its `fileId`, integrity metadata, expiry, and download command in the structured result

#### Scenario: Workflow requires interaction
- **WHEN** a non-interactive workflow would require a picker, editor, or confirmation dialog
- **THEN** the CLI SHALL return a stable interaction-required error and a safe next action
