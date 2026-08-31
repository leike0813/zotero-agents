# synthesis-concept-kb-index-engine Specification

## Purpose
Defines the Synthesis concept kb index engine, specifying its processing pipeline, input/output contracts, and integration with the parent capability.

## Requirements

### Requirement: Concept KB index engine SHALL use strict environment-neutral contracts


The engine SHALL expose canonical JSON-safe index and query requests and
results with explicit contract and algorithm versions.

#### Scenario: Unknown fields are supplied

- **WHEN** a request or result contains supported fields plus unknown JSON-safe fields
- **THEN** canonical rebuilding SHALL retain only supported camelCase fields.

#### Scenario: Invalid data is supplied

- **WHEN** input is cyclic, non-JSON, over a bound, duplicates an identifier,
  references a missing concept, changes its request basis, or violates
  deterministic result ordering
- **THEN** rebuilding SHALL reject it before application use.

### Requirement: Concept KB index engine SHALL preserve current index semantics


The engine SHALL deterministically build Concept KB search rows and overlay
entries from concept, sense, and alias source rows.

#### Scenario: Overlay entries are built

- **WHEN** active Concept KB rows are indexed
- **THEN** only active, non-low-confidence aliases that resolve to one active
  concept SHALL enter overlay
- **AND** sense definitions SHALL retain precedence over concept definitions.

#### Scenario: Search rows are built

- **WHEN** concepts are indexed
- **THEN** search rows SHALL preserve the current normalized label, aliases,
  short definition, definition, type, domain, and deterministic order.

### Requirement: Concept KB index engine SHALL preserve bounded query semantics


The engine SHALL return exact concept matches, exact alias matches, candidate
senses, and ambiguity derived from unique matching concept identifiers.

#### Scenario: Candidate label is queried

- **WHEN** a normalized label matches concept labels or aliases
- **THEN** the result SHALL identify matching rows and related senses
- **AND** SHALL mark the label ambiguous only when more than one concept matches.

### Requirement: Concept KB index engine SHALL be bounded and cancellable


The engine SHALL cap concepts at 25,000, senses at 100,000, aliases at 250,000,
per-concept aliases at 256, query labels at 100, and strings at 4,096 code
units.

#### Scenario: Checkpoint aborts computation

- **WHEN** a checkpoint callback throws during index or query computation
- **THEN** computation SHALL stop without returning a partial result.

### Requirement: Concept KB index engine SHALL be process-portable


The engine source SHALL not import plugin, Zotero, repository, persistence,
filesystem, runtime, DOM, or Node-only modules.

#### Scenario: Worker canary computes results

- **WHEN** canonical requests cross the test-only Node worker boundary
- **THEN** rebuilt worker results SHALL equal direct in-process execution.

### Requirement: Concept KB private compute SHALL use explicit Rust semantics

Concept, sense, alias, search, overlay, query-match, and ambiguity ordering SHALL use explicit UTF-16 comparison and SHALL execute in Rust for the private sidecar while the TypeScript engine remains the production plugin implementation and oracle.

#### Scenario: Large Concept KB is indexed or queried

- **WHEN** a canonical Concept KB request crosses multiple worker pages
- **THEN** Rust SHALL preserve exact search, overlay, definition precedence, match, sense, and ambiguity semantics
- **AND** the service SHALL publish only the complete strictly rebuilt result.
