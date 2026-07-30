# synthesis-host-artifact-read-port Specification

## Purpose
Defines the Synthesis Host port for host artifact read, specifying the injected interface that the application service uses to delegate to Host-owned implementation.

## Requirements

### Requirement: Artifact discovery is hash-first and payload-free

Artifact scanning SHALL return bounded pages of descriptors containing stable paper refs, artifact type, status, payload type, optional opaque locator, optional payload hash and estimated size, and bounded diagnostics. Scanning SHALL NOT return decoded payloads, note HTML, attachment paths, or Zotero objects.

#### Scenario: Available and missing artifacts are scanned
- **WHEN** the Host scans a bounded library page for supported artifact types
- **THEN** available artifacts SHALL carry a locator and hash without payload content
- **AND** missing or decode-error artifacts SHALL carry status and diagnostics without a readable locator

### Requirement: Artifact payload reads are locator- and hash-guarded

The Host SHALL read one artifact payload per request using a scan-issued opaque locator and expected hash. Available content SHALL be returned as typed JSON or text. Invalid locators SHALL fail before storage access. A current hash different from the expected hash SHALL return `stale` without returning mismatched content.

#### Scenario: Matching payload is read
- **WHEN** a valid locator and its current expected hash are supplied
- **THEN** the Host SHALL return the corresponding typed content and hash
- **AND** no local path SHALL cross the boundary

#### Scenario: Payload changed after scan
- **WHEN** the locator resolves but its current hash differs from the expected hash
- **THEN** the Host SHALL return `stale` and the current hash
- **AND** the stale payload SHALL NOT be consumed by the application

### Requirement: Reference refresh reads only changed payloads

Reference refresh SHALL scan descriptors, compare hashes with persisted artifact sidecars, and read only changed available references plus their matching available citation-analysis companions. Unchanged descriptors SHALL cause no payload read. Missing and decode-error references SHALL stale prior raw references without attempting a payload read.

#### Scenario: One reference artifact changed
- **WHEN** a scan contains many unchanged artifacts and one changed references hash
- **THEN** refresh SHALL read only that references locator and its matching citation-analysis locator
- **AND** existing progress, cache basis, graph staleness, and result behavior SHALL remain intact

#### Scenario: Descriptor becomes stale before read
- **WHEN** a changed descriptor's locator no longer matches its expected hash
- **THEN** refresh SHALL fail conservatively with a stable stale diagnostic
- **AND** previously usable raw-reference and cache state SHALL remain available

### Requirement: Reference artifact transport SHALL use a capability-specific bound

General reverse-Host responses SHALL retain the 1 MiB response and two-second
timeout policy. `library.artifacts.read` SHALL use an 8 MiB response-body bound
and ten-second timeout, with the same values enforced by the Host endpoint and
native client.

#### Scenario: Reference artifact exceeds the general bound only
- **WHEN** a valid `library.artifacts.read` response is larger than 1 MiB and no larger than 8 MiB
- **THEN** the reverse-Host transfers and decodes the complete response

#### Scenario: Reference artifact exceeds its capability bound
- **WHEN** the prepared UTF-8 response body is larger than 8 MiB
- **THEN** the Host returns `reverse_host_response_too_large`
- **AND** diagnostics contain the attempted response bytes and selected limit without payload content

### Requirement: Artifact size estimate SHALL cross the descriptor boundary

An available Host artifact descriptor SHALL carry the exact serialized payload
byte estimate calculated at the scan boundary when that estimate is available.
The estimate SHALL be a first-class descriptor field and SHALL NOT be hidden in
free-form diagnostics.

#### Scenario: Available reference artifact is scanned
- **WHEN** the Host constructs its references descriptor
- **THEN** the descriptor carries the payload hash, opaque locator, and exact estimated size used for admission evidence
