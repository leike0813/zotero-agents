## ADDED Requirements

### Requirement: Remote archive delivery uses a strict bounded DTO contract

The system SHALL expose a Host archive request containing only a supported capability, a safe ZIP display name, and canonical text entries, and SHALL return a canonical `available` or `unavailable` result without local paths, callbacks, Host handle objects, raw errors, or other non-JSON values.

#### Scenario: Unknown JSON-safe fields are provided

- **WHEN** a request or result contains valid declared fields plus unknown JSON-safe fields
- **THEN** canonical rebuilding SHALL retain only fields declared by the archive-delivery contract.

#### Scenario: Invalid boundary input is provided

- **WHEN** a request or result contains an unsupported capability, unsafe name/path, duplicate entry, invalid descriptor, mismatched owner, invalid digest/timestamp, or non-JSON value
- **THEN** canonical rebuilding SHALL reject it before Host I/O or application projection occurs.

### Requirement: Archive entries and diagnostics are bounded

The archive-delivery contract SHALL allow at most 256 entries, 5 MiB of UTF-8 content per entry, 50 MiB total content, and 20 diagnostics, using shared constants as the single source of truth.

#### Scenario: Request exceeds an archive limit

- **WHEN** an entry or aggregate request exceeds a declared bound
- **THEN** request rebuilding SHALL reject it before temporary storage, ZIP creation, or file registration.

### Requirement: Host adapter owns remote archive publication

The default Host adapter SHALL create the store ZIP in a managed temporary export root, calculate its integrity metadata, register it as a `bridge-export` file owned by the requested capability, and return the existing bridge-download projection.

#### Scenario: Archive publication succeeds

- **WHEN** a valid request is published
- **THEN** the adapter SHALL return an opaque downloadable descriptor, stable download command, unzip hint, ZIP size and SHA-256 without exposing its local path.

#### Scenario: Archive publication fails

- **WHEN** ZIP creation, temporary storage, hashing, or file registration fails
- **THEN** the adapter SHALL return `unavailable`, remove incomplete temporary output, and expose only a stable bounded diagnostic.

### Requirement: Remote Synthesis exports use the Host delivery port

Remote Topic Context and filtered paper-artifact export SHALL build their canonical text entries in the application and publish them exclusively through the Host archive-delivery port. Local Topic Context and ACP run-root writes SHALL retain their existing behavior.

#### Scenario: Remote Topic Context is requested

- **WHEN** `topics.get_context` uses remote delivery with an output path
- **THEN** the response SHALL preserve its existing output and `bridge-download` fields while the application performs no remote temporary-path, ZIP, or Host registry access.

#### Scenario: Remote filtered artifacts are requested

- **WHEN** `paper_artifacts.export_filtered` uses remote delivery
- **THEN** its manifest and filtered artifact content SHALL match local projection semantics and be delivered through one Host archive request.

#### Scenario: Delivery capability is unavailable or malformed

- **WHEN** the Host port is absent, throws, returns unavailable, or returns a malformed/mismatched result
- **THEN** the client call SHALL fail with stable `unavailable` semantics without a half response, local-path fallback, or raw Host error.

### Requirement: Composition makes remote delivery capability explicit

The default legacy composition SHALL inject the Host export-delivery adapter, the readonly composition SHALL omit it, and the complete service SHALL retain `125 methods / 1 direct consumer`.

#### Scenario: Default and readonly services are constructed

- **WHEN** production and readonly composition sources are inspected
- **THEN** only the default composition SHALL provide `hostExportDeliveryPort` and no public service method SHALL be added or removed.
