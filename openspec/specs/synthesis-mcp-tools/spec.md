## MODIFIED Requirements

### Requirement: Topic context supports explicit file output and remote delivery

`topics.get_context` SHALL retain local explicit output-path behavior and SHALL return the existing opaque Host Bridge download bundle for remote delivery. Remote archive publication SHALL cross `SynthesisHostExportDeliveryPort`; the application service SHALL NOT create the ZIP, allocate a remote export root, or register a Host Bridge file directly.

#### Scenario: Remote topic context output is requested

- **WHEN** a remote Host Bridge or MCP caller requests Topic Context with `outputPath` or `output_path`
- **THEN** the response SHALL include `output.mode: "bridge-download"`, `delivery.mode: "bridge-download"`, and an opaque file descriptor
- **AND** it SHALL NOT write the caller-provided path or disclose any Host-local path.

### Requirement: Remote filtered paper artifact export uses bridge-download bundle

`paper_artifacts.export_filtered` SHALL keep local run-root writes and SHALL use `SynthesisHostExportDeliveryPort` for a Host Bridge download bundle in remote connection mode.

#### Scenario: Remote filtered artifacts are requested

- **WHEN** one or more paper refs are exported through remote delivery
- **THEN** the archive SHALL contain the same filtered artifact text and manifest paths as the local projection
- **AND** the response SHALL preserve `delivery.mode: "bridge-download"` without exposing a temporary run root.
