# synthesis-reference-matcher-engine Specification

## Purpose
Defines the Synthesis reference matcher engine, specifying its processing pipeline, input/output contracts, and integration with the parent capability.

## Requirements

### Requirement: Reference matcher SHALL use strict environment-neutral contracts


The Reference Matcher engine SHALL expose separate canonical JSON-safe binding and canonical-dedupe requests and results with explicit contract and algorithm versions.

#### Scenario: Matcher request is rebuilt

- **WHEN** an application supplies matcher rows containing unknown JSON-safe fields
- **THEN** the contract SHALL rebuild canonical camelCase rows in stable order
- **AND** it SHALL discard unknown fields.

#### Scenario: Matcher contract is invalid

- **WHEN** input is non-JSON, duplicates an identity, contains invalid values, exceeds configured collection or string bounds, or an engine result omits, adds, or dangles input identities
- **THEN** strict rebuilding SHALL reject the request or result before durable promotion.

### Requirement: Binding engine SHALL reuse one private library index


The binding method SHALL build one matcher index from the request library papers and reuse it for every binding input without exposing `Map`, `Set`, or other non-JSON state.

#### Scenario: Binding operation processes many canonicals

- **WHEN** `matchBindings` receives a bounded library snapshot and multiple unbound canonical representatives
- **THEN** it SHALL return one deterministic result row per binding input
- **AND** suggested candidates SHALL be stably ordered and capped at three.

### Requirement: Canonical dedupe engine SHALL preserve clustered policy


The canonical-dedupe method SHALL preserve eligibility filtering, bounded blocking, deterministic and review edges, stable representatives, clusters, actions, counters, and diagnostics.

#### Scenario: Clustered dedupe executes

- **WHEN** `dedupeCanonicals` receives effective unbound canonical records
- **THEN** fuzzy and semantic-risk output SHALL remain review-only
- **AND** block and candidate-pair budgets SHALL not widen into all-pairs matching.

### Requirement: Reference matcher SHALL remain process portable


The matcher engine SHALL NOT import Node, DOM, Zotero, plugin toolkit, application runtime, repository, filesystem, or Host capabilities.

#### Scenario: Matcher runs through a worker canary

- **WHEN** canonical binding and dedupe requests run directly and through the Node-only test worker
- **THEN** both paths SHALL return identical rebuilt results after structured clone.

#### Scenario: Matcher checkpoint aborts

- **WHEN** an implementation checkpoint throws during index, reference, record, pair, or cluster processing
- **THEN** computation SHALL stop without returning partial results
- **AND** the checkpoint SHALL NOT appear in serialized DTOs.

### Requirement: Private matcher execution SHALL use Rust

Private reference binding and canonical dedupe SHALL execute through the shared Rust pool while the environment-neutral TypeScript engine remains the plugin production implementation and differential-test oracle.

#### Scenario: Private matcher preparation runs

- **WHEN** the isolated matching application prepares binding and dedupe work
- **THEN** it SHALL invoke `reference_binding.v1` and `reference_canonical_dedupe.v1`
- **AND** it SHALL NOT instantiate an in-process or Node-worker matcher engine.

### Requirement: Matcher publication validation SHALL not rerun the algorithm

Production result rebuilders SHALL validate versions, request identity, row completeness, uniqueness, stable ordering, cluster/action consistency, candidate limits, reference integrity, counters, diagnostics, and policy invariants without recomputing matching decisions in TypeScript.

#### Scenario: Fabricated matcher result is returned

- **WHEN** a worker changes an identity, ordering, cluster representative, action, score boundary, counter, or diagnostic relation
- **THEN** the rebuilder SHALL reject the result before application promotion.

### Requirement: Matcher quality SHALL not regress

The reviewed reference-resolution fixture matrix SHALL preserve precision, recall, candidate recall, cluster/pair budgets, suggestion boundaries, and zero danger false positives for every accepted strategy profile.

#### Scenario: Differential report is generated

- **WHEN** the reviewed gold labels are evaluated against TypeScript and Rust
- **THEN** Rust metrics SHALL be no lower than the migration baseline
- **AND** danger false positives SHALL equal zero.
