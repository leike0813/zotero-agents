# synthesis-cross-language-sidecar-contract Specification

## Purpose
TBD - created by archiving change define-synthesis-cross-language-canonical-semantics. Update Purpose after archive.
## Requirements
### Requirement: The v1 process boundary inventory is complete

The project SHALL maintain a versioned language-neutral contract inventory for every DTO that currently crosses the Synthesis service process or service/worker boundary, including system lifecycle, launch configuration, owner, lease, discovery, compute, transfer, canonical inspect, Workbench chrome, and Node runtime bundle/pointer v1 documents.

#### Scenario: A current boundary definition is audited

- **WHEN** the contract checker enumerates the manifest, schemas, corpora, and capability mappings
- **THEN** every declared artifact and definition SHALL exist exactly once
- **AND** no schema definition SHALL be orphaned from the capability inventory.

### Requirement: Schemas describe normalized DTOs

The v1 JSON schemas SHALL use JSON Schema Draft 2020-12 and SHALL describe the normalized output of strict TypeScript rebuilders rather than claiming that raw JSON input is already canonical.

#### Scenario: Raw input contains an unknown field

- **WHEN** an existing rebuilder admits the input and drops the unknown field
- **THEN** the positive corpus SHALL retain the raw input separately
- **AND** the normalized output SHALL satisfy the mapped schema without the unknown field.

### Requirement: Contract artifacts are strictly versioned and validated

The manifest, schemas, and positive/negative corpora SHALL have explicit versions and SHALL compile under Ajv strict Draft 2020-12 mode.

#### Scenario: Contract governance runs

- **WHEN** the checker validates the contract set
- **THEN** it SHALL reject missing, duplicate, unlisted, or invalid artifacts and definitions
- **AND** it SHALL compute a deterministic `sha256:<hex>` fingerprint over the complete listed set.

### Requirement: TypeScript remains the v1 behavior oracle

Every corpus case SHALL identify an existing TypeScript rebuilder or canonical operation that determines the current v1 result.

#### Scenario: A positive or negative case executes

- **WHEN** a positive raw input is rebuilt
- **THEN** its normalized value SHALL equal the corpus output and match its canonical bytes and hash
- **AND WHEN** a negative input is rebuilt
- **THEN** it SHALL return the corpus stable error code without requiring an exact error message.

### Requirement: Canonical JSON v1 is byte stable

Canonical JSON v1 SHALL encode JSON as UTF-8 without BOM, whitespace, or trailing newline; order object keys by non-locale UTF-16 code units; preserve array order; use ECMAScript JSON number rendering with negative zero serialized as `0`; and hash exactly those bytes as `sha256:<lowercase hex>`.

#### Scenario: Canonical edge cases are serialized

- **WHEN** values contain Unicode keys, supplementary characters, finite floats, or negative zero
- **THEN** TypeScript canonical bytes and hashes SHALL match the frozen corpus independently of the process locale.

#### Scenario: Existing v1 JavaScript normalization is exercised

- **WHEN** a value contains an undefined object field, undefined array/root value, or non-finite number
- **THEN** canonicalization SHALL preserve the frozen v1 omission or `null` normalization
- **AND WHEN** a value contains an unpaired surrogate or cyclic object
- **THEN** canonicalization SHALL fail with a stable structured error code.

### Requirement: Wire identities remain interoperable

Wire strings SHALL reject unpaired UTF-16 surrogates and integer identity fields SHALL remain within the JavaScript safe-integer range.

#### Scenario: A boundary value exceeds interoperability limits

- **WHEN** a wire identity contains an unpaired surrogate or an integer identity exceeds the safe range
- **THEN** the TypeScript oracle SHALL reject it with the mapped stable error code.

### Requirement: Contracts do not depend on repository runtime code

Protocol constants and canonical semantics SHALL be owned by `packages/synthesis-contracts`, which SHALL have zero runtime dependency on `packages/synthesis-repository`.

#### Scenario: Repository schema identity is consumed

- **WHEN** contracts and repository expose the foundation schema version
- **THEN** both SHALL resolve the same contracts-owned value
- **AND** the repository export MAY remain as a compatibility re-export.

### Requirement: Process DTOs are contract-first for Rust

A DTO SHALL enter the versioned contract set before a Rust process may parse or emit it.

#### Scenario: A Rust migration slice adds a boundary DTO

- **WHEN** the slice proposes a new or changed request, response, lifecycle, compute, transfer, canonical, discovery, or runtime document
- **THEN** its schema, capability mapping, and positive/negative corpus SHALL be accepted first.

### Requirement: Contract tooling stays outside production runtime

Ajv and JSON schema documents SHALL be used only by development and test governance and SHALL NOT be loaded by the Synthesis sidecar runtime bundle.

#### Scenario: The Node oracle service is built

- **WHEN** emitted service imports and packaged files are inspected
- **THEN** no Ajv import or contract schema JSON runtime load SHALL be present.

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

### Requirement: Cross-language contract SHALL cover Citation Graph Layout v2

The shared schema inventory, positive/negative corpus, canonical edge corpus, operation mapping, and fingerprint SHALL include `citation_graph_layout.v2`.

#### Scenario: Valid layout corpus is checked

- **WHEN** TypeScript and Rust rebuild the same v2 request and result fixtures
- **THEN** they SHALL agree on canonical field values, ordering, identifiers, version, engine, parameters, node membership, finite numbers, and hashes.

#### Scenario: Invalid layout corpus is checked

- **WHEN** a fixture contains an unknown algorithm, invalid hash, duplicate node, missing endpoint, non-finite coordinate, unsupported engine/version, extra result node, or graph over the accepted bounds
- **THEN** both boundaries SHALL reject it with the mapped stable failure class.

#### Scenario: Cancellation crosses the protocol

- **WHEN** an active layout task receives the existing cancel frame
- **THEN** the Rust worker SHALL stop at an iterative checkpoint and return the standard canceled terminal outcome.

