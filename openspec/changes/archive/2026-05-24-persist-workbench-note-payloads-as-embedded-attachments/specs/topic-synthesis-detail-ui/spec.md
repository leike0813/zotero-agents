# topic-synthesis-detail-ui Delta

## MODIFIED Requirements

### Requirement: Digest Modal SHALL Render Representative Image When Available

The topic detail source digest modal SHALL render a digest representative image from Zotero-legal note image markup.

#### Scenario: Representative image is available after normalization
- **WHEN** a user opens a source digest modal from topic evidence
- **AND** the digest note contains a valid `<img data-attachment-key="...">` backed by a note-child embedded-image attachment
- **THEN** the Workbench SHALL request representative image data from `resolveTopicPaperDigest`
- **AND** the modal SHALL render the image above the digest markdown body.

#### Scenario: Representative image wrapper is legacy
- **WHEN** a digest note still contains the old custom representative-image block
- **THEN** the resolver SHALL continue to read it for compatibility.
