## ADDED Requirements

### Requirement: Complex operation DTOs SHALL be contract-first
The contract manifest SHALL inventory the eight R5 operations, their request/result headers, page descriptors, canonical rows or chunks, terminal frames, schemas, positive/negative corpora, capability mappings, and TypeScript oracle identities before Rust parses or emits them.

#### Scenario: Cross-language checker runs
- **WHEN** contract governance validates the R5 inventory
- **THEN** every artifact SHALL exist exactly once and validate under strict Draft 2020-12 schemas
- **AND** TypeScript and Rust SHALL produce the same canonical bytes, stable error codes, and aggregate fingerprint.

### Requirement: Cross-language normalization SHALL be locale-independent
R5 contracts SHALL freeze UTF-16 code-unit ordering, NFKC normalization, English lowercase behavior, JavaScript-compatible finite-number rendering and rounding, safe-integer bounds, and SHA-256 over canonical UTF-8 bytes.

#### Scenario: Unicode and number edge corpus runs
- **WHEN** fixtures contain supplementary characters, combining forms, locale-sensitive letters, negative zero, boundary floats, or unsafe integers
- **THEN** TypeScript and Rust SHALL either emit identical canonical output or the same stable rejection code independently of host locale.

### Requirement: Canonical paging SHALL be bounded and acknowledged
Canonical row pages and Topic canonical UTF-8 chunks SHALL each remain within 4 MiB and 100,000 JSON nodes, carry ordered descriptors and SHA-256 identities, and require exact per-page acknowledgement.

#### Scenario: A stream is corrupted
- **WHEN** a page is oversized, duplicated, reordered, truncated, or has a mismatched byte length or hash
- **THEN** the receiver SHALL reject the stream before exposing a result.
