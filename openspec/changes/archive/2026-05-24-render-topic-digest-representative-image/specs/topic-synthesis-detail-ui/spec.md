## ADDED Requirements

### Requirement: Digest Modal SHALL Render Representative Image When Available

The topic detail source digest modal SHALL render a digest note representative
image when the selected digest note contains a valid representative image block
backed by a note-child embedded-image attachment.

#### Scenario: Representative image is available

- **WHEN** a user opens a source digest modal from topic evidence
- **AND** the digest note contains `data-zs-block="representative-image"`
- **AND** the referenced embedded image attachment belongs to that digest note
- **THEN** the Workbench SHALL request representative image data from `resolveTopicPaperDigest`
- **AND** the modal SHALL render the image above the digest markdown body
- **AND** the image SHALL include alt/caption text from the note block when available.

#### Scenario: Representative image is unavailable

- **WHEN** the representative image block is missing, invalid, unreadable, or points
  to an attachment outside the selected digest note
- **THEN** the modal SHALL still render the digest markdown result
- **AND** representative image failure SHALL NOT change the digest result from
  available to unavailable.

#### Scenario: Non-UI callers avoid binary payloads by default

- **WHEN** `resolveTopicPaperDigest` is called without
  `include_representative_image` or `includeRepresentativeImage`
- **THEN** the resolver SHALL omit image data URLs from the response.
