## ADDED Requirements

### Requirement: Topic application SHALL express canonical intent without constructing representation

The Topic application SHALL continue to own request and asset validation, Structured Artifact assembly and patching, metadata semantics, basis checks, operation lifecycle, and the canonical promotion commit point. It SHALL construct each complete canonical snapshot through the canonical representation interface and SHALL NOT derive canonical path identity, inject representation hashes, choose section filenames, or allocate canonical transaction identity itself.

#### Scenario: Topic apply reaches canonical preparation
- **WHEN** a create, full update, or patch has passed application and Structured Artifact validation
- **THEN** the application supplies representation-neutral Topic content to canonical preparation before promotion
- **AND** successful apply preserves the existing Topic result hashes, projections, warnings, and commit ordering

#### Scenario: Canonical preparation fails
- **WHEN** representation-neutral Topic content cannot be converted into a valid canonical representation
- **THEN** apply fails before canonical promotion and downstream projection writes
- **AND** the failure maps to the existing stable Topic result classification without string matching at the application seam

### Requirement: Legacy Topic adoption SHALL reuse canonical representation validation

Legacy production adoption SHALL obtain canonical identity, content, and basis through the canonical read representation while retaining legacy field normalization and SQLite projection derivation in the Topic application.

#### Scenario: Valid legacy Topic is adopted
- **WHEN** legacy Topic sources agree and the existing canonical current is valid
- **THEN** adoption derives Topic application state from the canonical read representation
- **AND** every pre-existing canonical file remains byte-identical

