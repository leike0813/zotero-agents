# topic-synthesis-detail-ui Specification

## Purpose
TBD - created by archiving change align-topic-synthesis-detail-ui-with-structured-artifact. Update Purpose after archive.
## Requirements
### Requirement: Topic Detail Exposes Review-Oriented Sections

Topic Detail SHALL expose six top-level tabs: Overview, Taxonomy, Claims,
Compare, External, and Coverage.

#### Scenario: Structured artifact contains review-oriented sections

- **GIVEN** a topic artifact has positioning, taxonomy, comparison matrix,
  debates, review outline, evidence map, claims, external literature analysis,
  coverage, and gaps
- **WHEN** Topic Detail renders
- **THEN** the user SHALL be able to inspect those structures through the six
  top-level tabs.

### Requirement: Evidence Explorer Supports Digest Inspection

Topic Detail SHALL render a right-side Evidence Explorer that opens the paper
digest modal through the existing digest resolver.

#### Scenario: User clicks a paper evidence row

- **WHEN** the user clicks a paper evidence row or timeline marker
- **THEN** the Workbench SHALL request `resolveTopicPaperDigest`
- **AND** the digest modal SHALL show the result or an unavailable state.

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

