# synthesis-cross-language-sidecar-contract Specification

## Purpose

Define canonical cross-language parity for native sidecar lifecycle identity and its shared corpus.

## Requirements

### Requirement: Native lifecycle identity SHALL have cross-language parity

A versioned language-neutral corpus SHALL define valid and invalid manifest v2,
launch, discovery, health, handshake, capability, timestamp, target, signature,
and fingerprint documents for TypeScript and Rust rebuilders.

#### Scenario: Corpus is checked
- **WHEN** TypeScript and Rust process the same native lifecycle corpus
- **THEN** both SHALL accept the same valid documents and return the same stable code for every invalid document

### Requirement: Complete sidecar protocol SHALL have cross-language parity

A JSON Schema 2020-12 registry and versioned corpus SHALL cover all sidecar capability and worker DTOs, including nested positive values and invalid values at every reachable object, array, map, and union boundary. TypeScript rebuilders and Rust serde DTOs SHALL accept and reject the same corpus entries with the same stable category.

#### Scenario: Protocol corpus is checked
- **WHEN** TypeScript and Rust process the complete sidecar protocol corpus
- **THEN** both accept every positive document
- **AND** both reject every derived nested negative document
- **AND** the registry reports 119 of 119 capabilities and 15 of 15 worker operations mapped

### Requirement: Current lifecycle versions SHALL be authoritative

The protocol registry SHALL describe the current launch v3, discovery v2, production discovery v5, runtime bundle, health, handshake, shutdown, error, diagnostic, trace, and observability documents. Superseded lifecycle shapes MUST NOT remain an alternative protocol SSOT.

#### Scenario: Stale lifecycle document is supplied
- **WHEN** a lifecycle document uses a superseded schema version or shape not declared by the current registry
- **THEN** both language implementations reject it as incompatible or invalid

### Requirement: Topic discovery candidates SHALL be recursively closed

The protocol registry SHALL define one strict `TopicDiscoveryCandidate` object shared by Topic Detail and discovery-hint command results. Every reachable candidate object and nested reasons array SHALL reject unknown fields and bound strings and collection sizes, and TypeScript and Rust SHALL accept and reject the same corpus entries.

#### Scenario: Discovery candidate corpus is checked
- **WHEN** TypeScript and Rust process valid and invalid Topic discovery candidate documents
- **THEN** both accept the same valid documents
- **AND** both reject unknown candidate fields, invalid statuses, missing identities, and out-of-bound reasons with the same stable category

#### Scenario: General Topic projection is checked
- **WHEN** a Topic list or summary projection is validated
- **THEN** it contains discovery counts and status without carrying an opaque hint-object array

### Requirement: Shared search contracts SHALL have TypeScript and Rust parity
The canonical sidecar protocol contract set SHALL define the strict shared search request, result, evidence passage, source identity, location, coverage, issue, and cursor-boundary DTOs for TypeScript and Rust.

#### Scenario: Valid search corpus is rebuilt
- **WHEN** TypeScript and Rust rebuild the same valid search request and result fixtures
- **THEN** both accept the same bounded values and preserve the same public fields and semantics

#### Scenario: Invalid search corpus is rebuilt
- **WHEN** either implementation receives unknown fields, malformed scope identities, invalid limits, invalid ranges, or unbounded issue/coverage values
- **THEN** both reject the fixture under the same stable invalid-contract category

#### Scenario: Unicode location corpus is rebuilt
- **WHEN** both implementations process evidence ranges over multilingual supplementary-plane text
- **THEN** they agree on UTF-16 half-open boundaries and reject ranges that split a Unicode character

### Requirement: Canonical JSON SHALL preserve cross-language content identity

TypeScript and Rust SHALL preserve JSON own keys and use the same ECMAScript numeric representation when calculating canonical bytes, page lengths and hashes, including worker input and output frames.

#### Scenario: Floating weights cross a paged worker transfer

- **WHEN** a valid graph transfer contains decimal/exponent boundary weights
- **THEN** the native worker accepts the input pages and publishes verifiable output pages
- **AND** the caller reads the original numeric weights without hash conflicts

#### Scenario: Vocabulary contains an own prototype-named key

- **WHEN** a valid alias map contains an own `__proto__` key
- **THEN** normalization, save, load and reopen preserve the key and value
- **AND** object prototypes remain unchanged

#### Scenario: Existing canonical storage contains v1 floating-point bytes

- **WHEN** a previously persisted Topic contains v1 numeric bytes and hashes
- **THEN** ordinary and bounded reads, export/import and promotion preserve its existing basis
- **AND** wire normalization does not rewrite stored artifacts or accept tampered bytes

### Requirement: Library Index SHALL preserve scope and independent continuation

Library Index results SHALL use the launch-bound library identity, including empty results and collection rows. Its closed request contract SHALL accept the partition continuations returned for tags, collections, topics and registry items.

#### Scenario: A caller continues one partition

- **WHEN** the caller submits a returned partition cursor
- **THEN** the requested partition advances without advancing unrelated partitions

#### Scenario: A nondefault library is empty or populated

- **WHEN** the bound library ID differs from one
- **THEN** top-level and collection identities retain that bound ID

#### Scenario: Topic inventory spans multiple domain pages

- **WHEN** more than 100 materialized Topics exist
- **THEN** Index continuation reaches every eligible Topic within the existing collection bound without silently truncating the total
- **AND** archived status is retained, ordinary status is omitted and deleted Topics are excluded

#### Scenario: A planned Topic has no materialized artifact

- **WHEN** the Topic graph contains a planned Topic without an application artifact
- **THEN** Index includes its identity and title in the same bounded, ordered inventory
- **AND** it does not invent an artifact path or duplicate a materialized Topic

### Requirement: Domain result projections SHALL satisfy their public schemas

Native adapters SHALL preserve domain facts in existing public and worker DTOs without bypassing validation. Tag audit SHALL retain camelCase results and durable replay compatibility; Tag validation SHALL retain warnings. Topic Graph provenance SHALL use EvidenceRecord. Reference targets and Concept alias reviews SHALL address exact entities, preserve unrelated facts and reject stale or malformed targets without mutation. Topic and WebDAV reads SHALL satisfy their public schemas.

#### Scenario: A stored alias audit is resolved

- **WHEN** a caller keeps or removes an open audited alias
- **THEN** keeping preserves alias records and closes the review as approved
- **AND** removing deletes the exact alias and updates its owner's concept/sense aliases while retaining their rows, then closes the review as rejected
- **AND** terminal facts survive reopen, while a missing or mismatched target leaves all facts unchanged

#### Scenario: A saved vocabulary violates supported validation rules

- **WHEN** a structurally valid vocabulary has a facet mismatch, a missing replacement or an alias targeting a missing tag
- **THEN** validation and the saved snapshot expose the corresponding warning codes, tags and severities
- **AND** a read-only validation does not mutate the vocabulary

#### Scenario: Nonempty domain records are indexed

- **WHEN** Concept records, senses, aliases or Topic Graph nodes and edges are present
- **THEN** index rebuild completes through the real worker protocol
- **AND** public queries expose the indexed concepts and graph placement

#### Scenario: A materialized Topic is read through each context view

- **WHEN** a caller requests semantic, digest, audit or full context, or its report
- **THEN** the response passes the existing public schema and preserves the requested Topic content
- **AND** audit/full triage contains stored judgments only, without marking untriaged papers as already triaged

#### Scenario: A caller expands references and manually retargets a proposal

- **WHEN** a typed client requests Reference details and submits a manual target using the public libraryId/itemKey fields
- **THEN** the details retain the reference identities and source facts in the public shape
- **AND** the accepted decision changes the binding to that exact target and closes the original proposal

#### Scenario: An unbased WebDAV conflict has no hash for a missing side

- **WHEN** sync blocks with a conflict whose optional hash is absent
- **THEN** the result omits that hash rather than publishing an invalid empty digest
- **AND** typed observation, pause and explicit resolution remain available

#### Scenario: A nonempty audit is acknowledged or conflicts

- **WHEN** a complete traversal publishes an active snapshot and a verified Host commit acknowledges one item
- **THEN** prepare, acknowledgement and replay results pass the public schema and preserve the remaining backlog across restart
- **AND** Host revision drift returns typed conflict without replacing the active snapshot

#### Scenario: Topic Graph relation supplies rationale without explicit provenance

- **WHEN** an applied relation supplies a rationale and omits provenance
- **THEN** the relation can be read through the public surface with that rationale in quote_or_summary
- **AND** subsequent relation and review decisions remain readable after restart

### Requirement: Reverse Host SHALL verify snapshot basis after awaited reads

The adapter SHALL reject a changed snapshot basis before publishing any awaited page result or continuation.

#### Scenario: Library changes while the final page is being read

- **WHEN** the library revision changes during an awaited page read
- **THEN** the adapter returns conflict with basis_mismatch before publishing a result or continuation
- **AND** a stable revision still permits normal pagination
