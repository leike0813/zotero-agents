# literature-digest-representative-image Specification

## Purpose
TBD - created by archiving change add-literature-digest-representative-image. Update Purpose after archive.
## Requirements
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

The Host SHALL prepare the optional selected representative image within the image preparation budget before submitting the notes in one atomic mutation. Ordinary image failures, unavailability, and timeouts SHALL skip the image without failing digest apply. Cancellation SHALL propagate and prevent subsequent note submission.

#### Scenario: Markdown source image is resolved
- **WHEN** the source attachment is Markdown and the locator resolves to a safe local relative image path
- **THEN** Host SHALL prepare the image through the unified compression policy
- **AND** Host SHALL import it as a Zotero embedded-image attachment under the digest note in the same note mutation
- **AND** Host SHALL write the digest note with an `<img data-attachment-key="...">` reference.

#### Scenario: PDF source cannot be resolved confidently
- **WHEN** the source attachment is PDF and deterministic high-confidence image extraction is unavailable
- **THEN** Host SHALL skip representative image embedding
- **AND** Host SHALL keep the digest/references/citation notes successfully written.

#### Scenario: Optional image fails or times out
- **WHEN** image preparation fails without cancellation or exceeds its budget
- **THEN** Host SHALL record a skipped diagnostic and submit the normal note set without the image.

#### Scenario: User cancels during image preparation
- **WHEN** image preparation reports cancellation
- **THEN** Host SHALL propagate cancellation and SHALL NOT continue to note submission.

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

