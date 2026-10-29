## ADDED Requirements

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
