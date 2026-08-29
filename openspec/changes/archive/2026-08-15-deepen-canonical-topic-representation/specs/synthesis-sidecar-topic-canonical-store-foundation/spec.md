## ADDED Requirements

### Requirement: Canonical Topic representation SHALL have one authoritative construction path

The canonical store SHALL derive Topic path identity, canonical manifest hashes, section filenames, canonical bytes, and transaction identity from representation-neutral content. Locally authored content and decoded durable assets SHALL produce an opaque prepared write that is the only value accepted by canonical promotion or import staging, while reads SHALL expose typed Topic content and basis without granting callers a write-construction path.

#### Scenario: Locally authored Topic is prepared
- **WHEN** the Topic application supplies valid representation-neutral Topic content
- **THEN** canonical preparation derives the complete snapshot, path, hashes, filenames, and canonical bytes without caller-supplied derived fields
- **AND** promotion returns the same observable Topic hashes, receipt, and persisted bytes as the existing canonical format

#### Scenario: Durable Topic assets are decoded
- **WHEN** durable import supplies a complete set of transport-neutral canonical Topic assets
- **THEN** canonical decoding validates paths, declared hashes, content bounds, and completeness before producing an opaque prepared write
- **AND** inconsistent assets fail before canonical staging

#### Scenario: Existing Topic is read
- **WHEN** a caller reads a valid current Topic
- **THEN** it receives typed Topic identity, content, and basis sufficient for patching and projection
- **AND** it does not receive filesystem layout, journal state, or a caller-constructible promotion value

### Requirement: Canonical representation failures SHALL be typed internally

Canonical preparation, decoding, reading, and promotion SHALL distinguish invalid representation, basis conflict, writer contention, repair-required state, and durable I/O failure without requiring callers to parse diagnostic strings. Existing public Topic and durable-import reason codes SHALL remain unchanged.

#### Scenario: Representation hash is invalid
- **WHEN** decoded canonical assets declare a hash that does not match their canonical content
- **THEN** decoding returns the typed invalid-representation outcome before staging
- **AND** public callers retain their existing stable failure classification

