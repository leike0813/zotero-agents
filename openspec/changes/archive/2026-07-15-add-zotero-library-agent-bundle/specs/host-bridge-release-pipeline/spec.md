## ADDED Requirements

### Requirement: Host Bridge release pipeline SHALL publish the Zotero Library Agent bundle
The Host Bridge release pipeline SHALL publish `leike0813/zotero-library-agent-bundle` alongside the CLI bundle and Zotero Librarian profile.

#### Scenario: CLI build workflow publishes all surfaces
- **WHEN** the Host Bridge CLI workflow records and verifies a complete prebuild set
- **THEN** it SHALL publish the CLI bundle, Zotero Library Agent bundle, and Zotero Librarian profile from the same source commit and checksum set.

#### Scenario: Surface-only workflow publishes all surfaces
- **WHEN** only semantic, schema, helper, renderer, or packaging inputs change
- **THEN** the workflow SHALL restore the latest published CLI prebuilds and publish all three surfaces without rebuilding Rust CLI binaries.

### Requirement: Release pipeline SHALL govern Zotero Library Agent bundle versions
The release pipeline SHALL classify public bundle changes and generated drift before rendering.

#### Scenario: Public bundle content changes
- **WHEN** a release changes public Zotero Library Agent bundle content without changing the CLI major/minor line
- **THEN** the pipeline SHALL require one bundle patch bump before rendering and publishing.

#### Scenario: Generated output is stale only
- **WHEN** only generated Zotero Library Agent output is stale
- **THEN** the pipeline SHALL require regeneration without changing the bundle patch.

### Requirement: Surface publication SHALL reject stale Zotero Library Agent inputs
Both Host Bridge release workflows SHALL verify the committed Zotero Library Agent surface before external publication.

#### Scenario: Agent bundle source is not rendered
- **WHEN** semantic, shared, schema, helper, or version sources do not match generated bundle files
- **THEN** publication SHALL fail before any external surface is updated.

