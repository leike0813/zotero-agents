# synthesis-sidecar-concept-kb-application-foundation Specification

## Purpose
Defines the application-level foundation for the Synthesis sidecar concept kb component, including its service boundary, lifecycle, and integration with the sidecar runtime.

## Requirements

### Requirement: Private sidecar owns an isolated Concept KB aggregate

The Synthesis sidecar SHALL persist an isolated Concept KB aggregate containing concepts, senses, aliases, relations, review items, topic-concept links, application state, and last-good index state without reading or mutating production storage.

#### Scenario: Service restarts after Concept mutations
- **WHEN** the isolated service restarts after committed aggregate or index changes
- **THEN** the private Concept application SHALL reconstruct the same current state from its isolated SQLite repository
- **AND** production database and canonical files SHALL remain untouched.

### Requirement: Private Concept contracts are strict and bounded

The private Concept application SHALL accept and return versioned JSON-safe DTOs with bounded collections, deterministic ordering, unique identities, valid references, stable structured codes, and strict field rebuilding.

#### Scenario: Malformed or oversized request arrives
- **WHEN** a private Concept request contains unknown fields, invalid identities, duplicate IDs, dangling references, or collections beyond configured engine or application limits
- **THEN** the request SHALL fail before repository mutation or engine execution.

### Requirement: Concept mutations use manifest compare-and-swap

Snapshot replacement, proposal ingestion, review transitions, display-text updates, and concept deletion SHALL construct and validate a detached candidate and promote it only while the expected manifest remains active.

#### Scenario: Mutation or manifest check fails
- **WHEN** candidate validation fails, a row operation throws, or the active manifest differs from the expected manifest
- **THEN** all aggregate rows, application revision, manifest, stale marker, and last-good index state SHALL remain unchanged.

### Requirement: Proposal ingestion applies deterministic Concept policy

The private application SHALL create stable concept, sense, alias, relation and topic-link facts for unmatched high-confidence proposals, merge exact unambiguous proposals, and create review items for ambiguous or low-confidence proposals.

#### Scenario: Exact proposal match is unambiguous
- **WHEN** a proposal label or alias resolves to exactly one existing concept and does not require low-confidence review
- **THEN** the proposal SHALL merge into that concept using stable identities and SHALL NOT create a duplicate concept.

#### Scenario: Proposal needs review
- **WHEN** a proposal is low confidence or resolves to more than one concept candidate
- **THEN** the application SHALL create one stable open review item and SHALL preserve the existing concepts until review.

### Requirement: Review transitions are explicit and atomic

The private application SHALL support approve, merge, and reject transitions from an open review item with stable target validation and one aggregate manifest update.

#### Scenario: Review is approved or merged
- **WHEN** an open review is approved as a new concept or merged into one valid target concept
- **THEN** all resulting concept, sense, alias, relation, topic-link and resolved-review facts SHALL commit atomically.

#### Scenario: Review is rejected
- **WHEN** an open review is rejected
- **THEN** the item SHALL become rejected with resolution metadata and no new concept facts.

### Requirement: Display updates and deletion preserve referential integrity

Display-text updates SHALL retain stable identities, and concept deletion SHALL atomically remove owned senses, aliases, relations and topic links while removing deleted candidates from review items.

#### Scenario: Concept is deleted
- **WHEN** one or more existing concept IDs are deleted under the active manifest
- **THEN** every dependent sense, alias, relation and topic link SHALL be removed
- **AND** review candidates SHALL contain no deleted concept ID.

### Requirement: Concept index promotion is manifest guarded

The private application SHALL construct the Concept index through the bounded sidecar worker and promote it only while its source manifest remains active.

#### Scenario: Index result is superseded or invalid
- **WHEN** index computation fails, is canceled, returns malformed output, or its source manifest is superseded
- **THEN** the last-good index, index hash and active basis SHALL remain unchanged
- **AND** aggregate mutation state SHALL remain authoritative and stale until a valid rebuild succeeds.

### Requirement: Candidate query is bounded and read only

The private application SHALL execute strict bounded Concept candidate queries through the sidecar worker against a captured aggregate snapshot without mutating repository state.

#### Scenario: Candidate query completes
- **WHEN** a valid bounded label query completes successfully
- **THEN** its result SHALL match the environment-neutral Concept engine result for the same snapshot
- **AND** manifest, revision, index state and rows SHALL remain unchanged.

### Requirement: Private Concept lifecycle drains before persistence closes

The private Concept application SHALL reject new mutations after admission stops and SHALL cancel or drain active computation before its repository and worker dependencies close.

#### Scenario: Service shutdown begins during Concept work
- **WHEN** shutdown begins while a Concept mutation or compute request is active
- **THEN** no new Concept mutation SHALL be admitted
- **AND** repository closure SHALL occur only after the application reaches a terminal drained state.

### Requirement: Concept foundation remains production disconnected

The private Concept foundation SHALL NOT add a public sidecar capability, authenticated route, `SynthesisClient` method, automatic invocation, Zotero adapter, production persistence owner, checkpoint/import behavior, canonical delivery, or WebDAV synchronization.

#### Scenario: Foundation is packaged
- **WHEN** the service bundle and plugin package include the Concept foundation
- **THEN** public capability and service method inventories SHALL remain `mutationEnabled:false` and `108 methods / 1 direct consumer`
- **AND** eight production engine owners SHALL remain unchanged
- **AND** the default composition SHALL have no path to production Concept state.
