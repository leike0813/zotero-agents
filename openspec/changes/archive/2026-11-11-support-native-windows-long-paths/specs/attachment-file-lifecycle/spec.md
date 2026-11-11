## MODIFIED Requirements

### Requirement: Native attachment destinations SHALL be checked before mutation

Stored imports SHALL preflight the eight-character-key storage directory, main and companion paths, and native fulltext atomic-cache paths against downstream attachment capabilities before attachment creation. Stored replacements SHALL validate their new and backup paths before moving old content. Native-readable long inputs SHALL use compatible staging when required. Insufficient destination budget SHALL fail without moving the user's storage root or changing existing filenames.

#### Scenario: Native storage has no space for a required auxiliary path

- **WHEN** the main filename fits but a native fulltext cache or its temporary sibling does not
- **THEN** import SHALL fail before dispatching attachment creation.

#### Scenario: Input is longer than the attachment consumer supports

- **WHEN** an ordinary long source is readable by the plugin's native file adapter
- **THEN** preparation SHALL copy it into exclusively owned compatible staging
- **AND** display metadata and companion relative references SHALL be preserved.
