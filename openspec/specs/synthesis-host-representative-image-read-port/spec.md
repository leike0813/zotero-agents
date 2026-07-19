# synthesis-host-representative-image-read-port Specification

## Purpose
Defines the Synthesis Host port for host representative image read, specifying the injected interface that the application service uses to delegate to Host-owned implementation.

## Requirements

### Requirement: Representative image Host reads use a strict bounded DTO contract


The system SHALL expose a representative-image Host read request containing only canonical `libraryId` and `noteKey` values, and SHALL return a canonical `absent`, `unavailable`, or `available` result without Zotero objects, note HTML, local paths, callbacks, or other non-JSON values.

#### Scenario: Unknown JSON-safe fields are provided

- **WHEN** a request or result includes valid required fields plus unknown JSON-safe fields
- **THEN** canonical rebuilding SHALL retain only fields declared by the representative-image read contract.

#### Scenario: Invalid boundary input is provided

- **WHEN** a request or result contains an invalid identifier, status, MIME type, base64 payload, byte count, dimension, diagnostic, or non-JSON value
- **THEN** canonical rebuilding SHALL reject the boundary value before Host lookup or application projection occurs.

### Requirement: Representative image payloads and diagnostics are bounded


The system SHALL limit decoded representative-image content to 2 MiB and SHALL limit result diagnostics to 20 entries, using shared contract constants as the single source of truth.

#### Scenario: Available content exceeds the byte limit

- **WHEN** a Host adapter encounters representative-image content larger than 2 MiB
- **THEN** it SHALL return a bounded `unavailable` result rather than transporting the content.

#### Scenario: A result exceeds the diagnostic limit

- **WHEN** a caller attempts to rebuild a result with more than 20 diagnostics
- **THEN** the contract SHALL reject that result.

### Requirement: Host adapter validates Zotero image ownership and bytes


The legacy Host adapter SHALL resolve the requested note and descriptor attachment, verify that the attachment is an image child of that note, read bounded non-empty bytes from a valid attachment path, and return base64 content plus declared presentation/source metadata.

#### Scenario: Supported representative image is available

- **WHEN** the note contains a supported representative-image marker backed by a note-child image attachment whose non-empty bytes are within the limit
- **THEN** the adapter SHALL return `available` with the attachment key, image MIME type, base64 content, alt/caption metadata, optional dimensions, compressed byte count, source kind, strategy, and bounded diagnostics.

#### Scenario: Note has no supported marker

- **WHEN** the requested note contains no supported representative-image marker
- **THEN** the adapter SHALL return `absent` without treating the note as an image failure.

#### Scenario: Marked image cannot be safely read

- **WHEN** the marked attachment is missing, is not an attachment, has the wrong parent, is not an image, lacks a usable path, is empty, is oversized, or cannot be read
- **THEN** the adapter SHALL return `unavailable` with a stable reason and SHALL NOT expose a local path or raw runtime error.

### Requirement: Representative image pure logic remains environment-neutral


Descriptor parsing and digest UI projection SHALL operate only on strings and representative-image DTOs and SHALL NOT import runtime persistence, access Zotero globals, resolve local paths, or perform file I/O.

#### Scenario: Application code resolves an available Host result

- **WHEN** the service receives a canonical `available` representative-image result
- **THEN** the pure projection SHALL produce the existing snake_case metadata and image data URL shape without consulting Host runtime state.

### Requirement: Composition makes representative image Host access explicit


The default legacy Synthesis composition SHALL inject the Zotero representative-image read adapter, while readonly composition SHALL omit the port and the public `SynthesisService` method inventory SHALL remain unchanged.

#### Scenario: Default and readonly services are created

- **WHEN** composition constructs the default legacy service and the readonly service
- **THEN** only the default legacy service SHALL receive representative-image Host read capability and the inventory SHALL remain `128 methods / 1 direct consumer`.
