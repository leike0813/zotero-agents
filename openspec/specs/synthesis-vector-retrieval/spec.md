# Synthesis Vector Retrieval Specification

## Purpose

Provides optional semantic retrieval over existing Zotero material and canonical Topic text while preserving their source ownership, scope, provenance and explicit maintenance controls.

## Requirements

### Requirement: Retrieval SHALL use existing eligible sources

Retrieval SHALL index metadata, existing Markdown, canonical digest/analysis and canonical Topic sections only. It SHALL preserve portable identity, current source version, source kind and original UTF-16 ranges. It SHALL NOT generate missing artifacts or parse raw PDFs to fill coverage gaps.

#### Scenario: Material is missing or excluded

- **WHEN** a source is absent or is an ordinary note, annotation, conversation or raw PDF
- **THEN** it contributes no vectors; expected missing material is a coverage gap and is distinct from a read or encoding failure

#### Scenario: Unicode fragment is retrieved

- **WHEN** a fragment contains supplementary Unicode characters
- **THEN** its half-open UTF-16 range resolves to the original source text without splitting a surrogate pair

### Requirement: Embedding SHALL remain Host-owned

The Host SHALL own connections, credentials, file reads and embedding HTTP. The sidecar SHALL receive only bounded text, vectors and encoding identity. OpenAI-compatible Embeddings and Ollama `/api/embed` SHALL be supported with explicit query/document prefixes and supported output dimensions.

#### Scenario: Credentials are saved

- **WHEN** a connection is configured or used
- **THEN** credentials are encrypted at rest and are absent from sidecar, public search, logs and workbench snapshots

#### Scenario: Configuration is tested

- **WHEN** the user tests a connection
- **THEN** only small fixed synthetic query/document inputs are sent, and actual dimensions and latency are reported

### Requirement: Index identity SHALL be independent of a connection

One active index per Synthesis data root SHALL bind model ID, actual dimensions, paired encoding, source rules and active scope. Address, credentials and connection identity SHALL NOT bind vectors. Encoding or scope edits SHALL remain pending until explicit rebuild publication.

#### Scenario: Compatible service changes

- **WHEN** a service is changed or deleted while model, dimensions and encoding remain compatible
- **THEN** the retained ready index remains reusable; absent compatible services suspend enhancement without deleting it

#### Scenario: Encoding changes

- **WHEN** the user saves another model, dimension or prefix
- **THEN** the target remains pending and switches atomically with a complete rebuild

### Requirement: Embedding responses SHALL be validated atomically

Every response SHALL have one uniquely associated finite nonzero vector per input, all in the expected actual dimension. Explicit response indices SHALL permit reordering; ambiguous, missing, duplicate or extra associations SHALL fail the entire batch. Query text SHALL never be truncated; document splitting SHALL retain original source ranges.

#### Scenario: One response vector is invalid

- **WHEN** a response has a non-finite value, zero norm, mismatched dimension or invalid association
- **THEN** no vector from that response is persisted or used

#### Scenario: Query exceeds service capacity

- **WHEN** the full query cannot be encoded
- **THEN** the independent lexical search uses the full query and reports actual fallback; Ollama requests disable server truncation

### Requirement: Embedding fallback SHALL share an operation budget

Queries SHALL try selected compatible primary/fallback services in order, each at most once under one deadline. Build batches SHALL have at most three total attempts including fallback, honor retry delays and not retry authentication/model/configuration errors on the same service.

#### Scenario: Primary service fails

- **WHEN** the primary cannot return a valid compatible vector
- **THEN** the next selected compatible service consumes the remaining deadline and attempt budget rather than resetting them

### Requirement: Retrieval publication SHALL be source-group atomic

Known source changes SHALL suspend only the affected group until a complete compatible replacement publishes. Full rebuild SHALL suspend all semantic retrieval until complete publication; failure or cancellation before publication SHALL retain useful staging and keep semantic retrieval suspended. Expected absence SHALL not block publication, but unreadable existing content or failed encoding SHALL block it.

#### Scenario: Incremental replacement is incomplete

- **WHEN** one fragment in a changed source group cannot be encoded
- **THEN** the group remains unavailable while unrelated published groups remain usable

#### Scenario: Full rebuild is canceled

- **WHEN** a rebuild stops before complete publication
- **THEN** active semantic retrieval stays paused and completed compatible staging can be reused by explicit recovery

### Requirement: Reads SHALL NOT initiate index work

Index creation and full rebuild SHALL require explicit user maintenance. Reliable scoped changes MAY enqueue bounded updates only for an existing index. Startup, queries and Home reads SHALL NOT perform a full source scan, encode missing sources or start index maintenance.

#### Scenario: Empty index is opened

- **WHEN** the user opens Home or runs search without an index
- **THEN** no build starts and searches use their independent lexical behavior

### Requirement: Semantic ranking SHALL respect hard scope and original vectors

Eligible scope SHALL be intersected before semantic scoring. Ranking SHALL use cosine recomputed from original float32 vectors with sequential float64 accumulation, cast to float32, and stable identity for ties. Multiple fragments SHALL aggregate to a document's best fragment before fusion. Candidate-only reranking SHALL NOT claim full-scope top-k completeness.

#### Scenario: Equal identities in different libraries exist

- **WHEN** the same item key or DOI occurs in two libraries
- **THEN** results retain distinct full portable identities and only permitted library/filter intersections contribute

#### Scenario: Candidate coverage is bounded

- **WHEN** full eligible scope cannot be searched within measured resources
- **THEN** the result truthfully reports limited coverage and unknown total rather than implying complete ranking

### Requirement: Similarity SHALL use identifiable summary material

Paper-detail similarity SHALL exclude its seed and restrict scope to the seed's library and active index. Seed material SHALL prefer title plus metadata abstract, then an existing canonical digest overview marked generated, then title marked weak. It SHALL NOT guess summaries from arbitrary Markdown or generate a new digest.

#### Scenario: Abstract is absent

- **WHEN** a paper has a canonical digest with structured overview
- **THEN** similarity uses that overview and labels its material source; if also absent it uses a visibly weak title-only seed

#### Scenario: Semantic retrieval is unavailable

- **WHEN** no compatible ready index or service exists
- **THEN** similarity reports unavailability and does not present lexical results as semantic recommendations

### Requirement: Discovery SHALL preserve user decisions

Post-publication Discovery SHALL use Topic description and positive interests, excluding adopted or user-rejected papers. Missing usable description SHALL preserve existing hints and request description. Candidate commit SHALL revalidate Topic/source/user-state basis. Failure SHALL not roll back index publication, and recovery SHALL resume candidate work without rebuilding vectors.

#### Scenario: User rejects a candidate during generation

- **WHEN** a pending candidate batch attempts to publish after rejection
- **THEN** it preserves rejection and does not reopen the candidate

#### Scenario: Screened candidate basis changes

- **WHEN** Topic constraints or candidate material change
- **THEN** a previously screened-out candidate can be reconsidered; explicit user rejection persists until explicit restore
