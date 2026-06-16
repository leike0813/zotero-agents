## ADDED Requirements

### Requirement: Remote topic context file output uses bridge-download bundle

`topics.get_context` SHALL keep local file output behavior and SHALL use a Host
Bridge download bundle when invoked through a remote Host Bridge connection mode.

#### Scenario: Local topic context writes outputPath
- **WHEN** `topics.get_context` is called with an explicit `view` and
  `outputPath`
- **AND** the Host Bridge connection mode is `local`
- **THEN** the service SHALL write the view JSON to `outputPath`
- **AND** the response SHALL include `output.mode: "file"`.

#### Scenario: Remote topic context returns a bundle
- **WHEN** `topics.get_context` is called with an explicit `view` and
  `outputPath`
- **AND** the Host Bridge connection mode is `remote`
- **THEN** the service SHALL NOT write to the caller-provided path
- **AND** the service SHALL create a zip bundle whose entry path is the
  normalized requested output path
- **AND** the response SHALL include `output.mode: "bridge-download"`
- **AND** the response SHALL include `delivery.mode: "bridge-download"`
- **AND** the response SHALL NOT expose any host-local absolute path.

### Requirement: Remote filtered paper artifact export uses bridge-download bundle

`paper_artifacts.export_filtered` SHALL keep local run-root writes and SHALL use
a Host Bridge download bundle when invoked through a remote Host Bridge
connection mode.

#### Scenario: Local filtered paper artifact export writes run root
- **WHEN** `paper_artifacts.export_filtered` is called with `run_root`
- **AND** the Host Bridge connection mode is `local`
- **THEN** the service SHALL write
  `runtime/payloads/paper-artifacts-manifest.json` and content files under the
  supplied run root
- **AND** the response SHALL include `manifest_file` as that relative path.

#### Scenario: Remote filtered paper artifact export returns a bundle
- **WHEN** `paper_artifacts.export_filtered` is called for one or more paper refs
- **AND** the Host Bridge connection mode is `remote`
- **THEN** the service SHALL generate the filtered manifest and content files in
  a host temporary export directory
- **AND** the service SHALL create a zip bundle preserving the
  `runtime/payloads/...` relative paths
- **AND** the response SHALL include `manifest_file` as the path inside the zip
- **AND** the response SHALL include `delivery.mode: "bridge-download"`
- **AND** the response SHALL NOT expose the host temporary export directory.
