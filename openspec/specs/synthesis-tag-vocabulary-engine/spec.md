# synthesis-tag-vocabulary-engine Specification

## Purpose
Defines the Synthesis tag vocabulary engine, specifying its processing pipeline, input/output contracts, and integration with the parent capability.

## Requirements

### Requirement: Tag Vocabulary engine SHALL use strict environment-neutral contracts


The Tag Vocabulary engine SHALL expose canonical JSON-safe validation and index-build requests and results with explicit contract and algorithm versions.

#### Scenario: Engine request is rebuilt

- **WHEN** an application supplies a request containing supported fields plus unknown JSON-safe fields
- **THEN** the engine contract SHALL rebuild supported camelCase fields in deterministic order
- **AND** it SHALL discard unknown fields.

#### Scenario: Invalid request is rejected

- **WHEN** a request is non-JSON, cyclic, contains invalid strings or protocol values, duplicates canonical identifiers, or exceeds a collection bound
- **THEN** canonical rebuilding SHALL reject it before validation or index computation runs.

#### Scenario: Malformed result is returned

- **WHEN** an engine result changes its request basis, omits or duplicates required rows, violates deterministic ordering, or contains invalid warning or index data
- **THEN** result rebuilding SHALL reject the result before application persistence or projection promotion.

### Requirement: Tag Vocabulary engine SHALL preserve TagVocab v1 semantics


The engine SHALL preserve current entry normalization, protocol validation, warning codes, severities, ordering, active-tag selection, abbreviation casing, replacement checks, alias checks, and search-index construction.

#### Scenario: Vocabulary is validated

- **WHEN** canonical TagVocab entries, aliases, abbreviations, and protocol are supplied
- **THEN** the engine SHALL return the same deterministic warnings as the current Tag Vocabulary implementation.

#### Scenario: Index is built

- **WHEN** a valid request includes a manifest basis and rebuild timestamp
- **THEN** the engine SHALL return active tags, aliases, abbreviations, search rows, and validation warnings in the current persisted projection shape semantics.

### Requirement: Tag Vocabulary engine SHALL be bounded and cancellable


The engine SHALL cap entries at 25,000, global aliases at 50,000, abbreviations at 10,000, protocol facets at 256, per-entry aliases and abbreviations at 256 each, and strings at 4,096 code units.

#### Scenario: Request exceeds a bound

- **WHEN** any request collection or string exceeds its configured production bound
- **THEN** the request SHALL fail before partial results are returned.

#### Scenario: Checkpoint aborts computation

- **WHEN** a checkpoint callback throws during validation or index construction
- **THEN** computation SHALL stop and no partial result SHALL be returned.

### Requirement: Tag Vocabulary engine SHALL be process-portable


The engine source SHALL not import plugin, Zotero, repository, persistence, filesystem, runtime, or Node-only modules.

#### Scenario: Worker canary computes an index

- **WHEN** a canonical request is transferred to the test-only Node worker through structured clone
- **THEN** the worker result SHALL equal direct in-process execution after strict result rebuilding.
