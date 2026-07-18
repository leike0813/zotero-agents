## ADDED Requirements

### Requirement: Host item references SHALL be stable and canonical

Synthesis Host contracts SHALL identify Zotero items only by a positive `libraryId` and non-empty bounded `itemKey`, and SHALL rebuild known fields into a canonical JSON-safe object.

#### Scenario: Item ref contains unknown JSON-safe fields
- **WHEN** a Host item ref is rebuilt with valid identity plus unknown fields
- **THEN** the result SHALL contain only `libraryId` and `itemKey`

#### Scenario: Item ref is invalid
- **WHEN** a ref has an invalid library ID, item key, prototype, callback, cyclic value, or non-JSON value
- **THEN** rebuilding SHALL fail before Host access

### Requirement: Legacy staged parent IDs SHALL resolve through a bounded Host port

The migration port SHALL accept one library and at most 100 unique positive item IDs and SHALL return a canonical exact partition of resolved refs and missing IDs.

#### Scenario: Legacy IDs resolve
- **WHEN** valid legacy IDs identify items in the requested library
- **THEN** the Host SHALL return each ID with its stable item ref
- **AND** unknown result fields SHALL be discarded

#### Scenario: Legacy IDs are missing or cross-library
- **WHEN** an ID is missing or resolves outside the requested library
- **THEN** it SHALL appear only in `missingItemIds`

#### Scenario: Resolution result is malformed
- **WHEN** IDs are duplicated, omitted, unexpected, or present in both result partitions
- **THEN** canonical result rebuilding SHALL fail

### Requirement: Staged Tag writes SHALL use bounded semantic effects

The Tag effect port SHALL accept batches of at most 50 unique ensure-present effects carrying stable target refs, bounded tags, staged-promotion provenance, target-exists preconditions, and explicit `synthesis.tags` permission.

#### Scenario: Tag is absent
- **WHEN** a valid effect targets an existing item without the tag
- **THEN** the Host SHALL add the tag and return an `applied` receipt

#### Scenario: Tag is already present
- **WHEN** the target already has the tag ignoring case
- **THEN** the Host SHALL return `already_satisfied` without another mutation

#### Scenario: Target is unavailable
- **WHEN** the target is missing or unsupported
- **THEN** the Host SHALL return `not_found` with a stable diagnostic

#### Scenario: Host mutation fails
- **WHEN** Zotero tag mutation throws
- **THEN** the Host SHALL return `failed` with stable diagnostics
- **AND** it SHALL NOT expose the raw error, Zotero object, callback, or local path

### Requirement: Tag effect receipts SHALL be canonical and correlated

Each receipt SHALL repeat the effect ID and action, carry a valid timestamp, contain at most 20 JSON-safe diagnostics, and exactly correspond to one requested effect.

#### Scenario: Batch returns valid mixed receipts
- **WHEN** a batch independently applies, satisfies, misses, or fails targets
- **THEN** every requested effect SHALL receive exactly one canonical receipt

#### Scenario: Receipt batch is mismatched
- **WHEN** a receipt is missing, duplicated, unexpected, wrong-action, oversized, or non-JSON
- **THEN** the application SHALL reject the batch as malformed
