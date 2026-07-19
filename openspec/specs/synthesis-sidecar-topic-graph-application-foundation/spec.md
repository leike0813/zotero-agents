# synthesis-sidecar-topic-graph-application-foundation Specification

## Purpose
Defines the application-level foundation for the Synthesis sidecar topic graph component, including its service boundary, lifecycle, and integration with the sidecar runtime.

## Requirements

### Requirement: Private sidecar owns an isolated Topic Graph aggregate

The Synthesis sidecar SHALL persist an isolated Topic Graph aggregate containing nodes, edges, review items, application state, and last-good index state without reading or mutating production storage.

#### Scenario: Service restarts after Topic Graph mutations
- **WHEN** the isolated service restarts after committed aggregate or index changes
- **THEN** the private Topic Graph application SHALL reconstruct the same current state from its isolated SQLite repository
- **AND** production database, canonical files and projection registry SHALL remain untouched.

### Requirement: Private Topic Graph contracts are strict and bounded

The private Topic Graph application SHALL accept and return versioned JSON-safe DTOs with bounded collections, deterministic ordering, unique identities, valid references, stable structured codes, and strict field rebuilding.

#### Scenario: Malformed or oversized request arrives
- **WHEN** a private Topic Graph request contains unknown fields, invalid identities, duplicate IDs, dangling edge references, invalid relation state, or collections beyond configured engine or application limits
- **THEN** the request SHALL fail before repository mutation or engine execution.

### Requirement: Topic Graph mutations use manifest compare-and-swap

Snapshot replacement, node/edge upsert, proposal ingestion, relation/review transitions and deletion SHALL construct and validate a detached candidate and promote it only while the expected manifest remains active.

#### Scenario: Mutation or manifest check fails
- **WHEN** candidate validation fails, a row operation throws, or the active manifest differs from the expected manifest
- **THEN** all aggregate rows, application revision, manifest, stale marker, and last-good index state SHALL remain unchanged.

### Requirement: Proposal ingestion applies deterministic Topic Graph policy

The private application SHALL map proposal types to canonical relation tuples, create suggested edges for valid proposals, create review items for low-confidence proposals, reject unknown targets, self edges and hierarchy cycles, and preserve prior confirmed or rejected decisions.

#### Scenario: Valid high-confidence proposal arrives
- **WHEN** a proposal has a known target, valid direction and sufficient confidence without creating a hierarchy cycle
- **THEN** the application SHALL create or update one stable suggested edge with merged provenance and evidence.

#### Scenario: Proposal needs review or is unsafe
- **WHEN** a proposal is low confidence
- **THEN** the application SHALL create one stable open review item without creating a suggested edge
- **AND WHEN** a proposal targets an unknown topic, itself, a hierarchy cycle, or an existing user decision
- **THEN** the application SHALL preserve current graph facts and return a structured diagnostic.

### Requirement: Relation and review transitions are explicit and atomic

The private application SHALL support suggested-edge confirm/reject and open-review approve-suggested/reject transitions with stable target validation and one aggregate manifest update.

#### Scenario: Review is approved as suggested
- **WHEN** an open review is approved with `approve_suggested`
- **THEN** the item SHALL become approved and one stable suggested edge SHALL be created or restored atomically
- **AND** the edge SHALL require a separate explicit decision before becoming confirmed.

#### Scenario: Relation or review is rejected
- **WHEN** a suggested edge or open review is rejected
- **THEN** its rejected state and resolution metadata SHALL commit atomically without overwriting a prior closed decision.

### Requirement: Topic deletion preserves two-stage lifecycle

Topic relation deletion SHALL first mark related edges and review items deleted, and explicit purge SHALL later remove deleted topic nodes and every related edge/review row.

#### Scenario: Topic relations are deleted and purged
- **WHEN** mark-delete runs for a topic
- **THEN** related facts SHALL remain auditable with deleted status
- **AND WHEN** purge runs for that topic
- **THEN** eligible deleted nodes and all related edge/review rows SHALL be removed atomically.

### Requirement: Topic Graph index promotion is manifest guarded

The private application SHALL construct the Topic Graph index through the bounded sidecar worker and promote it only while its source manifest remains active.

#### Scenario: Index result is superseded or invalid
- **WHEN** index computation fails, is canceled, returns malformed output, or its source manifest is superseded
- **THEN** the last-good index, index hash and active basis SHALL remain unchanged
- **AND** aggregate mutation state SHALL remain authoritative and stale until a valid rebuild succeeds.

### Requirement: Private Topic Graph lifecycle drains before persistence closes

The private Topic Graph application SHALL reject new mutations after admission stops and SHALL cancel or drain active computation before its repository and worker dependencies close.

#### Scenario: Service shutdown begins during Topic Graph work
- **WHEN** shutdown begins while a Topic Graph mutation or compute request is active
- **THEN** no new Topic Graph mutation SHALL be admitted
- **AND** repository closure SHALL occur only after the application reaches a terminal drained state.

### Requirement: Topic Graph foundation remains production disconnected

The private Topic Graph foundation SHALL NOT add a public sidecar capability, authenticated route, `SynthesisClient` method, automatic invocation, Zotero adapter, production persistence owner, checkpoint/import behavior, canonical delivery, discovery cascade, Workbench filtering, or WebDAV synchronization.

#### Scenario: Foundation is packaged
- **WHEN** the service bundle and plugin package include the Topic Graph foundation
- **THEN** public capability and service method inventories SHALL remain `mutationEnabled:false` and `108 methods / 1 direct consumer`
- **AND** eight production engine owners SHALL remain unchanged
- **AND** the default composition SHALL have no path to production Topic Graph state.
