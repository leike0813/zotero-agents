# literature-digest-representative-image Specification

## ADDED Requirements

### Requirement: Literature Digest SHALL Treat Representative Image Metadata As Optional

The system SHALL treat `representative_image` as an optional `literature-digest` result JSON object that identifies a representative image by textual metadata rather than image bytes.

#### Scenario: Result includes selected representative image metadata
- **WHEN** result JSON contains `representative_image.status = "selected"`
- **THEN** the object SHALL include enough textual locator data for Host-side resolution, such as `source_kind`, `label`, `caption_quote`, `page_hint`, or `markdown_src_hint`
- **AND** it SHALL NOT include image bytes or require the backend to upload all source images.

#### Scenario: Result has no representative image
- **WHEN** `representative_image` is absent or has `status = "none"`
- **THEN** digest note generation SHALL behave as it did before this capability.

### Requirement: Host SHALL Resolve And Embed Representative Images Best-Effort

The Host SHALL attempt to materialize the selected representative image after the digest note is written, and image failure SHALL NOT fail the digest apply step.

#### Scenario: Markdown source image is resolved
- **WHEN** the source attachment is Markdown and the locator resolves to a safe local relative image path
- **THEN** Host SHALL prepare the image through the unified compression policy
- **AND** Host SHALL import it as a Zotero embedded-image attachment under the digest note
- **AND** Host SHALL update the digest note with an `<img data-attachment-key="...">` reference.

#### Scenario: PDF source cannot be resolved confidently
- **WHEN** the source attachment is PDF and deterministic high-confidence image extraction is unavailable
- **THEN** Host SHALL skip representative image embedding
- **AND** Host SHALL keep the digest/references/citation notes successfully written.

### Requirement: Host SHALL Compress Representative Images Before Embedding

The Host SHALL apply one bounded JPEG compression policy before creating the embedded-image attachment.

#### Scenario: Image is prepared for note embedding
- **WHEN** Host prepares a representative image
- **THEN** the output SHALL be `image/jpeg`
- **AND** the output long edge SHALL be no larger than `720px`
- **AND** the output target size SHOULD be no larger than `180 KiB`
- **AND** the output hard size SHALL be no larger than `320 KiB`
- **AND** JPEG quality SHALL NOT be lowered below `0.70`.

#### Scenario: Image cannot fit within the hard cap
- **WHEN** an image cannot be prepared under the hard cap without going below the minimum quality
- **THEN** Host SHALL skip embedding that image
- **AND** Host SHALL record a warning/skipped result rather than embedding the original image.
