## MODIFIED Requirements

### Requirement: Runtime file boundaries SHALL normalize local path inputs

Shared runtime file boundaries, including Host-owned materializers, SHALL convert supported native paths, Windows drive paths using forward slashes, and local `file:` URLs through the platform path service before invoking platform filesystem primitives.

#### Scenario: Windows drive path reaches Zotero file API

- **WHEN** a workflow passes a local path such as `E:/research/image.jpg` to the Host file surface
- **THEN** the system SHALL pass a native Windows-shaped path to Zotero IOUtils.

#### Scenario: Research Bundle materializes a Windows Markdown source

- **WHEN** the Host-owned Research Bundle materializer reads a Markdown source or eligible image expressed as a Windows drive-slash path or standard local `file:` URL
- **THEN** every filesystem probe, read, and copy SHALL receive a Host-native path
- **AND** portable containment and output paths SHALL remain independent of the native path syntax.

#### Scenario: Local file URL reaches Product storage

- **WHEN** a workflow registers a Product local-file source using a local `file:` URL
- **THEN** Product storage SHALL normalize the source before existence checks and copy operations.

#### Scenario: Existence probe cannot parse or access a path

- **WHEN** path normalization fails or the platform existence primitive rejects the input
- **THEN** the Host file existence probe SHALL return `false`
- **AND** strict read, write, and copy operations SHALL continue to reject invalid inputs.
