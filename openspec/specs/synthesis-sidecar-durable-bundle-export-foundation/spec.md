# synthesis-sidecar-durable-bundle-export-foundation Specification

## Purpose
Defines the runtime foundation for the Synthesis sidecar durable-bundle-export component, including its service wiring, dependency injection, and integration with the sidecar process lifecycle.

## Requirements

### Requirement: Complete durable entity contract

The system SHALL define one strict durable entity contract for `concept`, `concept_sense`, `concept_alias`, `concept_relation`, `concept_review_item`, `topic_current_asset`, `topic_concept_links`, `topic_graph_node`, `topic_graph_edge`, `topic_graph_review_item`, `canonical_reference`, `canonical_reference_redirect`, `reference_binding`, `reference_match_proposal`, `review_item`, `topic_interest_metadata`, `topic_discovery_hint`, `tag_vocabulary`, `tag_aliases`, `tag_abbrev`, `tag_protocol`, `related_items_sync_effect`, and `tombstone`.

#### Scenario: All current durable facts are represented
- **WHEN** each live durable owner contains valid current facts
- **THEN** export SHALL represent each fact with its registered kind, identity, schema, canonical data and existing stable path semantics

#### Scenario: Tombstones are verification-only
- **WHEN** the current-state exporter builds a bundle
- **THEN** it SHALL NOT synthesize a tombstone, while a valid input tombstone SHALL remain readable and verifiable

### Requirement: Exact and bounded wire shapes

The system SHALL reject unknown fields, unsupported schema or entity kinds, unsafe paths, duplicate asset paths, duplicate entity identities, invalid bundle-kind mappings, and collections outside the durable limits SSOT. Manifest and entry aggregate limits SHALL be mechanically derived from the existing domain limits, and each encoded bundle SHALL retain the production v2 four-MiB canonical-text length boundary.

#### Scenario: Invalid wire data is rejected
- **WHEN** a manifest, bundle, entry or legacy envelope contains an unknown field, invalid identity or path, inconsistent kind, duplicate identity, or exceeds a derived collection bound
- **THEN** verification SHALL fail with a structured diagnostic and SHALL NOT return a normalized export

#### Scenario: Oversized groups are split deterministically
- **WHEN** an ordered entity group does not fit in one four-MiB bundle
- **THEN** the builder SHALL split it into stable `.part-NNNN.json` chunks whose ordering and content depend only on the normalized facts and injected clock

#### Scenario: An indivisible entry exceeds the limit
- **WHEN** a single entry cannot fit inside a four-MiB bundle
- **THEN** export SHALL fail instead of emitting an oversized asset

### Requirement: Canonical v2 export

The builder SHALL emit only manifest schema v2 and bundle schema v2 using the existing manifest fields, capabilities, domain versions, bundle kinds, path layout, canonical JSON, content-hash, bundle-hash and manifest-hash semantics.

#### Scenario: Equal facts and time produce equal bytes
- **WHEN** two builds receive the same normalized facts, captured bases, producer version and injected timestamp in different source iteration orders
- **THEN** their bundle paths, bundle texts, manifest text and manifest hash SHALL be identical

#### Scenario: Hash or size metadata differs
- **WHEN** an asset, entry or manifest declares a count, canonical-text length, canonical content hash or aggregate hash that differs from its content
- **THEN** verification SHALL reject the export with a structured mismatch diagnostic

### Requirement: Legacy v1 read and verify

The reader SHALL accept valid legacy manifest v1 exports with per-entity assets while the builder SHALL never generate that legacy layout.

#### Scenario: Valid legacy export is read
- **WHEN** a source provides a bounded, exact-field v1 manifest and matching per-entity envelopes
- **THEN** verification SHALL return the same normalized entity facts and hashes used by v2 callers

#### Scenario: Build after reading legacy input
- **WHEN** normalized legacy facts are provided to the builder
- **THEN** the resulting export SHALL use only the canonical v2 manifest and bundle layout

### Requirement: Transactional repository capture

The repository SHALL capture all available durable SQLite rows, Topic registry bases and normalized aggregate bases within one read transaction without creating placeholder rows, invoking domain mutation applications, or adding a new durable schema.

#### Scenario: Owners contain rows and empty collections
- **WHEN** some durable owners contain facts and another isolated owner has none
- **THEN** capture SHALL return every existing fact and a stable empty aggregate for the empty owner without manufacturing an entity

#### Scenario: A row changes during canonical reads
- **WHEN** the repository basis recaptured after Topic current reads differs from the initial transactional basis
- **THEN** build SHALL fail with `basis_superseded` and SHALL NOT publish a manifest

### Requirement: Canonical Topic current capture

The application SHALL read Topic current content only through the canonical-store identity rules, allowing current `.json` and `.md` files while excluding asset descendants, HTML, `.metadata.json` and any unregistered or unsafe path.

#### Scenario: Allowed current assets are stable
- **WHEN** a registered Topic current asset is read and its content hash and canonical identity still match the recaptured inspection
- **THEN** export SHALL include its exact content in a `topic_current_asset` entity

#### Scenario: Canonical content changes or is damaged
- **WHEN** a captured Topic file is missing, malformed, has a path/hash identity mismatch, or changes during capture
- **THEN** the entire build SHALL fail with validation or `basis_superseded` diagnostics and SHALL NOT publish a manifest

### Requirement: Environment-neutral verification source

The private application SHALL verify exports through a `SynthesisDurableBundleSource` that reads manifest and asset text without depending on Node filesystem or Zotero runtime APIs.

#### Scenario: Source verifies a valid export
- **WHEN** the source supplies a valid v1 or v2 manifest and every referenced asset
- **THEN** `readAndVerify` SHALL return a strict, path- and entity-sorted normalized result with no error diagnostic

#### Scenario: Source is incomplete
- **WHEN** a referenced asset is unavailable or the source returns different bytes
- **THEN** `readAndVerify` SHALL return structured diagnostics and no normalized complete export

### Requirement: Manifest-last sink publication

The private application SHALL write canonical bundle texts to `SynthesisDurableBundleSink` in stable path order and write the manifest only after every bundle write succeeds.

#### Scenario: All writes succeed
- **WHEN** a built export is published successfully
- **THEN** the sink SHALL observe path-sorted bundle writes followed by exactly one manifest write

#### Scenario: A bundle write fails
- **WHEN** any bundle write rejects
- **THEN** publication SHALL stop, SHALL NOT write the manifest, and SHALL NOT claim a verifiable complete export

### Requirement: Private lifecycle and capability boundary

The durable export application SHALL admit only one active operation, SHALL reject new operations after `stopAdmission`, and `shutdown` SHALL drain the active lease before repository, canonical-store and SQLite closure. It SHALL expose no public worker, RPC, client, Workbench, Host Bridge or MCP operation.

#### Scenario: Shutdown waits for active export
- **WHEN** shutdown begins while one build or verification operation is active
- **THEN** new admission SHALL fail and shutdown SHALL resolve only after that operation settles

#### Scenario: Service composition and public inventory are inspected
- **WHEN** the isolated service is created after repository recovery and later closed
- **THEN** the private durable exporter SHALL be constructed after recovery, drained before its dependencies, and public method/consumer inventories SHALL remain at their established counts

### Requirement: Production durable-sync compatibility

Production durable-sync exports SHALL preserve existing public DTOs, function names, progress phases, valid v2 paths and bytes, legacy fallback, preview/apply results, sync-index and conflict behavior while delegating semantically identical contract and codec operations to the shared foundation.

#### Scenario: Existing production facts are exported
- **WHEN** production exports an established compatibility fixture using the same injected clock
- **THEN** its v2 bundle paths, canonical texts and manifest hash SHALL match the pre-delegation fixture

#### Scenario: WebDAV and host boundaries are exercised
- **WHEN** existing WebDAV, HEAD/ETag, retry, conflict, credential, autosync and Host export-port tests run
- **THEN** their observable behavior and capability surfaces SHALL remain unchanged
