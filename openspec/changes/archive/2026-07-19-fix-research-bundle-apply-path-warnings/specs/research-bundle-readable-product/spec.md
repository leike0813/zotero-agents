## ADDED Requirements

### Requirement: Research Bundle apply SHALL tolerate optional image resolution failures

Research Bundle materialization SHALL treat a missing, unparseable, or otherwise unresolved Markdown-linked local image as unavailable optional material.

#### Scenario: Local image resolver rejects a candidate

- **WHEN** resolving or probing a Markdown-linked local image rejects before the image is registered as a Product asset
- **THEN** apply SHALL preserve the original Markdown destination
- **AND** it SHALL omit the image from Product assets
- **AND** the Product manifest SHALL record `markdown_image_missing`
- **AND** the parent Product apply SHALL continue.

#### Scenario: Accepted image copy fails

- **WHEN** an image has been accepted as a Product asset and its later copy operation fails
- **THEN** Product atomic failure policy SHALL reject apply rather than publish an inconsistent manifest.

### Requirement: Research Bundle apply SHALL report materialization warning counts

The Research Bundle apply hook SHALL derive its apply diagnostics from the complete Product manifest warnings.

#### Scenario: Product is created with warnings

- **WHEN** Research Bundle materialization succeeds with one or more manifest warnings
- **THEN** the apply hook SHALL return the warning total and warning code counts through `applyDiagnostics`
- **AND** the Product manifest SHALL remain the complete warning source of truth.
