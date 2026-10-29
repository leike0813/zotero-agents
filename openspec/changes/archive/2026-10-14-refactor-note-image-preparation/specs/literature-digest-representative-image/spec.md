# Spec Delta

## MODIFIED Requirements

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
