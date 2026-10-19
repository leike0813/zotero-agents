# synthesis-cross-language-sidecar-contract Specification

## Purpose

Define canonical cross-language parity for native sidecar lifecycle identity and its shared corpus.

## Requirements

### Requirement: Native lifecycle identity SHALL have cross-language parity

A versioned language-neutral corpus SHALL define valid and invalid manifest v3,
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
- **AND** the registry reports every production capability and worker operation mapped (current baseline: 135 capabilities and 15 workers)
- **AND** mapping totals remain separate from executed coverage and its uncovered obligations

### Requirement: Current lifecycle versions SHALL be authoritative

The protocol registry SHALL describe the current launch v4, discovery v2, production discovery v5, runtime bundle, health, handshake, shutdown, error, diagnostic, trace, and observability documents. Superseded lifecycle shapes MUST NOT remain an alternative protocol SSOT.

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

### Requirement: Protocol coverage SHALL be derived from production obligations

Coverage SHALL enumerate capability request/result/error and worker input/output header/section/error contracts from production rosters. It SHALL separately report entry samples, recursive structure, cross-language execution and workflow producer evidence, with a complete uncovered list. Missing, skipped and mock-only evidence SHALL not count as executed coverage.

#### Scenario: A mapped capability has no executed sample

- **WHEN** coverage is checked
- **THEN** the capability remains uncovered and the completion gate fails

#### Scenario: A nested branch or bound is absent

- **WHEN** a reachable union branch or declared object, scalar, array or map constraint has no matching evidence
- **THEN** the report identifies the uncovered schema obligation

### Requirement: Cross-language evidence SHALL exercise production implementations

Shared samples SHALL execute production TypeScript rebuilders and Rust decoding, projection and serialization. Invalid requests SHALL also reach the native route without TypeScript prevalidation. Common cases SHALL agree on acceptance and stable error category. Every workflow producer SHALL cross its real hook, Host facade and native client.

#### Scenario: A language accepts a malformed nested request

- **WHEN** the other language rejects the shared sample
- **THEN** parity fails even if both implementation-specific suites pass

#### Scenario: Workflow output is accepted only by a mock

- **WHEN** the workflow producer has no real native execution evidence
- **THEN** it remains uncovered

#### Scenario: Entry slots pass without evidence from the actual receiver

- **WHEN** all protocol entry slots have production exchange receipts but a schema-derived recursive obligation has no matching production receiver verification
- **THEN** the cross-language structure report retains that obligation id as uncovered and the overall completion gate fails

#### Scenario: A message is produced by Rust and consumed by TypeScript

- **WHEN** a capability result/error, worker output/error or Reverse Host request is verified
- **THEN** a real production exchange proves its producer executed
- **AND** positive, boundary and malformed values execute the production TypeScript receiver with the declared error classification
- **AND** the report identifies TypeScript as the receiver without requiring a nonexistent Rust input route for its own output

#### Scenario: A shared definition reaches both message directions

- **WHEN** a recursive schema obligation is reachable by both TypeScript and Rust receivers
- **THEN** both production receivers need matching execution evidence
- **AND** an absent receiver, skipped probe or divergence prevents completion

#### Scenario: A direct worker has no section transport

- **WHEN** metrics or layout executes its direct run protocol
- **THEN** its input and output section schemas reject every JSON value
- **AND** explicit absence samples represent no transmitted section without inventing a null or empty-object DTO
- **AND** section slots require a successful real process exchange without sections and actual receiver rejection of attempted sections
- **AND** all 135 capability entries, 15 worker entries and 480 message slots remain in the roster while recursive obligations follow the corrected schema graph

#### Scenario: A paged worker header violates the shared contract

- **WHEN** a run header violates a declared version, enum, required or closed field, string length, or numeric bound
- **THEN** production Rust rejects it as `invalid_request` before accepting input sections
- **AND** valid Unicode strings at the Schema character limit remain accepted
- **AND** producers supply the required protocol version

#### Scenario: A canceled run has not executed deferred validation

- **WHEN** a worker returns cancellation after header admission
- **THEN** that observation does not count as rejection of a nested constraint
- **AND** unobserved compute validation remains uncovered

#### Scenario: String capacities and passage positions use their declared measures

- **WHEN** a search request, cursor or evidence string reaches its Schema length bound
- **THEN** producers and receivers count Unicode code points for that capacity
- **AND** passage offsets and range equality retain UTF-16 position semantics
- **AND** paging relations and source identities remain domain validation after structural decoding

### Requirement: Native build identity SHALL include embedded contract inputs

Source and build fingerprints SHALL include the protocol registry, schemas and SQL embedded by the production runtime, so their changes invalidate older native bundles.

#### Scenario: Embedded protocol or database schema changes

- **WHEN** a compiled registry, protocol schema or repository SQL input changes
- **THEN** the current source and build identity change
- **AND** an older seven-target bundle cannot pass the current freshness check
