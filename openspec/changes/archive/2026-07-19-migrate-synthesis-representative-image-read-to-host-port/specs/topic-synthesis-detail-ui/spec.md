## MODIFIED Requirements

### Requirement: Digest Modal SHALL Render Representative Image When Available

The topic detail source digest modal SHALL render a digest representative image from Zotero-legal note image markup when optional Host image enrichment returns a valid available result, and digest resolution SHALL remain successful when that enrichment is absent, unavailable, malformed, unconfigured, or fails.

#### Scenario: Representative image is available after normalization

- **WHEN** a user opens a source digest modal from topic evidence
- **AND** representative-image inclusion is requested and the digest note contains a valid `<img data-attachment-key="...">` backed by a note-child embedded-image attachment
- **THEN** the Workbench SHALL request representative image data from `resolveTopicPaperDigest`
- **AND** the modal SHALL render the image above the digest markdown body using the existing data-URL and snake_case projection.

#### Scenario: Representative image wrapper is legacy

- **WHEN** a digest note still contains the old custom representative-image block
- **THEN** the Host resolver SHALL continue to read it for compatibility.

#### Scenario: Representative image enrichment is not usable

- **WHEN** representative-image inclusion is disabled, the digest has no note key, the Host port is absent, the Host result is `absent`, or the Host read throws or returns a malformed or unavailable result
- **THEN** digest resolution SHALL NOT fail
- **AND** `representative_image` SHALL be omitted
- **AND** transport, malformed, and unavailable failures SHALL use stable diagnostics without exposing raw Host errors.
