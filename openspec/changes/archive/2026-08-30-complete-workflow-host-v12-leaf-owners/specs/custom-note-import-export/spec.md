## MODIFIED Requirements

### Requirement: Embedded image writes SHALL preserve one content boundary

Note creation and content update SHALL accept embedded images only as unique logical slots bound to opaque prepared-image refs from the same workflow run. The Host MUST validate content format, slot syntax and completeness, prepared refs, MIME, dimensions, and aggregate byte limits before mutation; materialize all new image attachments within the canonical note operation; clean replaced plugin-managed images; and issue one receipt covering the note and all affected attachments.

#### Scenario: Prepared image cannot be staged before note mutation
- **WHEN** any slot binding is duplicate, missing, unused, invalid, foreign, expired, or cannot be staged
- **THEN** the note remains unchanged and any operation-local staging is cleaned
- **AND** the failure does not expose a path or prepared bytes

#### Scenario: Image copy fails after note creation
- **WHEN** an accepted note mutation creates image attachments but cannot commit note content
- **THEN** cleanup of every new attachment is attempted and the original note failure remains primary
- **AND** the returned attempt reports any residue as `unknown` or `repair_required` without claiming committed success

#### Scenario: Text content declares an embedded image
- **WHEN** a text-format note content request includes an embedded-image slot
- **THEN** validation fails before any attachment or note write

#### Scenario: Accepted note operation is replayed
- **WHEN** the same operation identity and prepared-image bindings are replayed
- **THEN** the canonical mutation result is reused
- **AND** no duplicate image attachment is created

