# Spec Delta

## MODIFIED Requirements

### Requirement: Embedding SHALL remain Host-owned

The Host SHALL own connections, nonsecret configuration, credentials, file reads, endpoint resolution, model discovery and embedding HTTP. The sidecar SHALL receive only bounded text, vectors and encoding identity for OpenAI, Ollama, TEI, Cohere, Voyage and Gemini. Credentials SHALL be encrypted separately and SHALL NOT enter snapshots or free-form parameters.

#### Scenario: Credentials are saved

- **WHEN** a connection is configured or used
- **THEN** credentials are encrypted at rest and are absent from sidecar, public search, logs and workbench snapshots

#### Scenario: Configuration is tested

- **WHEN** the user tests a connection
- **THEN** only small fixed synthetic query/document inputs are sent, and actual dimensions and latency are reported
- **AND** model-discovery or `show` metadata does not populate the requested output dimension

### Requirement: Index identity SHALL be independent of a connection

One active index per Synthesis data root SHALL bind model ID, actual dimensions, paired encoding, source rules and active scope. Paired encoding SHALL include an optional canonical `encodingOptionsKey` derived only from effective query/document options. Address, authentication, credentials, discovery, and connection identity SHALL NOT bind vectors. Encoding or scope edits SHALL remain pending until explicit rebuild publication.

#### Scenario: Compatible service changes

- **WHEN** a service is changed or deleted while model, dimensions and encoding remain compatible
- **THEN** the retained ready index remains reusable; absent compatible services suspend enhancement without deleting it

#### Scenario: Encoding changes

- **WHEN** the user saves another model, dimension, prefix, or effective encoding option
- **THEN** the target remains pending and switches atomically with a complete rebuild

#### Scenario: Legacy identity has no encoding options

- **WHEN** an OpenAI or Ollama connection has no effective query/document option differences
- **THEN** its identity retains the existing model, dimension, query-prefix, and document-prefix fields without `encodingOptionsKey`, and omission remains valid across the Host-sidecar boundary

### Requirement: Embedding responses SHALL be validated atomically

Every adapter response SHALL associate one complete vector with every input and SHALL reject ambiguous, missing, duplicate, or extra associations for the entire response. Every vector SHALL contain only finite float32 values at the expected actual dimension and SHALL have a nonzero norm. OpenAI, Ollama, TEI, Cohere, Voyage, and Gemini native batch envelopes SHALL normalize to the same result contract. Query text SHALL never be truncated; document splitting SHALL retain original source ranges.

#### Scenario: One response vector is invalid

- **WHEN** a response has a non-finite value, zero norm, mismatched dimension or invalid association
- **THEN** no vector from that response is persisted or used

#### Scenario: Protocol uses a native batch envelope

- **WHEN** a supported protocol returns vectors in its native batched shape
- **THEN** the adapter maps every vector to its request input exactly once before atomic validation
- **AND** a malformed envelope rejects the complete response

#### Scenario: Query exceeds service capacity

- **WHEN** the full query cannot be encoded
- **THEN** the independent lexical search uses the full query and reports actual fallback; Ollama and other adapters with a truncation field disable server truncation

### Requirement: Embedding fallback SHALL share an operation budget

Requests SHALL be split by protocol capacity under one operation deadline. Queries SHALL try selected compatible primary/fallback services in order, each at most once. Document batches SHALL make at most three total attempts including fallback, honor retry delays and not retry authentication, model or configuration errors on the same service. A batch SHALL publish no vectors unless every response segment completes validly.

#### Scenario: Primary service fails

- **WHEN** the primary cannot return a valid compatible vector
- **THEN** the next selected compatible service consumes the remaining deadline and attempt budget rather than resetting them

#### Scenario: Request exceeds protocol capacity

- **WHEN** an input batch exceeds a protocol's request capacity
- **THEN** it is split into protocol-sized requests that share the operation deadline and document-attempt budget
- **AND** incompletion of one segment leaves the logical batch unpublished

#### Scenario: Configuration error is returned

- **WHEN** a service returns an authentication, model, or configuration error
- **THEN** that service is not retried for the same batch

## ADDED Requirements

### Requirement: Connection configuration SHALL preserve endpoint and model semantics

Connections SHALL accept full embedding endpoints, independent discovery settings, none/bearer/named-header authentication, and common/query/document parameters. Parameters SHALL contain nonsecret options; credentials SHALL use encrypted storage. Root, API-root, and endpoint resolution SHALL preserve proxy prefixes, queries, legacy base-URL semantics, and raw model IDs.

#### Scenario: Existing connection remains compatible

- **WHEN** an existing OpenAI-compatible or Ollama connection is loaded without the new optional fields
- **THEN** endpoint resolution and the original model string follow the prior configuration semantics

#### Scenario: Endpoint includes a proxy prefix and query

- **WHEN** a connection URL contains a deployment proxy path or query parameters
- **THEN** protocol endpoint resolution preserves that prefix and those parameters without collapsing them into a host-only URL

#### Scenario: Named-header authentication is selected

- **WHEN** authentication type is `header`
- **THEN** the configured safe header name receives the credential and transport-owned or unsafe headers are rejected

#### Scenario: A credential is placed in a parameter object

- **WHEN** free-form common, query, or document parameters contain credential material
- **THEN** validation rejects that draft and the credential is not stored in nonsecret configuration

### Requirement: Protocol adapters SHALL own native request construction

Each protocol adapter SHALL construct its native request envelope and enforce its input and output differences. It SHALL merge common parameters followed by purpose-specific parameters, SHALL never truncate query text, and SHALL reject parameters that override adapter-owned model, input, dimension, output-format, or truncation fields.

#### Scenario: Purpose parameters refine common parameters

- **WHEN** a parameter appears in both `common` and the active purpose object
- **THEN** the purpose value is sent while unrelated common parameters remain present

#### Scenario: Adapter-owned field is supplied

- **WHEN** a parameter object attempts to override a model, input, dimension, output-format, or truncation field
- **THEN** validation rejects the connection before any request is sent

#### Scenario: Protocol model identifier has a prefix

- **WHEN** a protocol requires a namespaced wire model
- **THEN** the adapter adds that wire prefix without rewriting the saved raw model identifier

### Requirement: Model discovery SHALL be explicit and draft-owned

Discovery SHALL use the explicitly requested draft and available credential. Catalog results SHALL retain provider identifiers under one 15-second, 20-page, 1,000-entry budget. Partial results and manual entry SHALL remain available. Failure SHALL preserve input; cancellation and stale-owner results SHALL not update any draft.

#### Scenario: Provider supplies a model catalog

- **WHEN** discovery runs for an OpenAI-compatible, TEI, Cohere, or Gemini connection
- **THEN** the result follows that protocol's catalog shape and applicable endpoint filters

#### Scenario: Ollama model is selected

- **WHEN** discovery has loaded Ollama tags and the user selects a model
- **THEN** the adapter may query the selected model's `show` metadata without changing the saved model identifier or requested output dimension
- **AND** the actual dimension is established only by an explicit synthetic probe

#### Scenario: Discovery capability is unavailable

- **WHEN** discovery is requested for Voyage, Jina, or an Azure deployment name
- **THEN** the UI reports that generic discovery is unsupported and retains manual model entry

#### Scenario: Discovery reaches a bound

- **WHEN** a catalog exceeds the deadline, page limit, or entry limit
- **THEN** completed entries remain available as an explicit partial result
- **AND** the failed or remaining portion does not replace valid input or an earlier result

#### Scenario: Draft owner changes

- **WHEN** discovery is canceled or a response arrives after the active draft changes
- **THEN** the stale response applies to no current draft

#### Scenario: Provider catalog omits a model

- **WHEN** a service catalog has no entry for a model
- **THEN** discovery does not fabricate or infer that model and the user may enter it manually

### Requirement: Save-and-test SHALL bind configuration before indexing

Save-and-test SHALL validate, serialize configuration and credential writes, restore prior values on persistence failure, then probe the saved connection outside the write queue. Success SHALL bind request configuration and credential revision independently of index identity. Failed or stale probes SHALL not create indexes or replace newer verification; fallback SHALL require compatible encoding identity.

#### Scenario: Save-and-test succeeds

- **WHEN** the user explicitly saves and tests a valid draft
- **THEN** both nonsecret configuration and credential are persisted before the synthetic probe starts
- **AND** the reported dimensions and latency bind that saved configuration and credential version

#### Scenario: Save fails before the probe

- **WHEN** configuration or encrypted-credential persistence fails
- **THEN** both persisted values are restored to their previous revision and no probe starts

#### Scenario: Save-and-test fails

- **WHEN** either synthetic input cannot produce a valid response
- **THEN** the operation reports failure, retains the user's draft, and creates or updates no index

#### Scenario: Configuration changes during a test

- **WHEN** connection configuration or its credential changes while a test is in flight
- **THEN** the older test result does not mark the newer version as tested

#### Scenario: An older identical probe completes late

- **WHEN** two probes for the same request configuration overlap and the newer probe succeeds first
- **THEN** the older completion cannot replace the newer successful result

#### Scenario: Different connections save concurrently

- **WHEN** configuration or credential writes for different connections overlap
- **THEN** persistence is serialized, neither save loses the other credential-list entry, and their probes may proceed independently

#### Scenario: Fallback identity differs

- **WHEN** an ordered fallback connection uses another model, dimension, prefix pair, or effective encoding options
- **THEN** it is excluded from requests for the active encoding identity
