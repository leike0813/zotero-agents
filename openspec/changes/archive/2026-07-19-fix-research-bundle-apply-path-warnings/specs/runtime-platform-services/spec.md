## ADDED Requirements

### Requirement: Runtime file boundaries SHALL normalize local path inputs

Shared runtime file boundaries SHALL convert supported native paths, Windows drive paths using forward slashes, and local `file:` URLs through the platform path service before invoking platform filesystem primitives.

#### Scenario: Windows drive path reaches Zotero file API

- **WHEN** a workflow passes a local path such as `E:/research/image.jpg` to the Host file surface
- **THEN** the system SHALL pass a native Windows-shaped path to Zotero IOUtils.

#### Scenario: Local file URL reaches Product storage

- **WHEN** a workflow registers a Product local-file source using a local `file:` URL
- **THEN** Product storage SHALL normalize the source before existence checks and copy operations.

#### Scenario: Existence probe cannot parse or access a path

- **WHEN** path normalization fails or the platform existence primitive rejects the input
- **THEN** the Host file existence probe SHALL return `false`
- **AND** strict read, write, and copy operations SHALL continue to reject invalid inputs.
