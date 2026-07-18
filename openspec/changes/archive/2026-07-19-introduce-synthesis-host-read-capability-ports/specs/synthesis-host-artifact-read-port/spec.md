## ADDED Requirements

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
