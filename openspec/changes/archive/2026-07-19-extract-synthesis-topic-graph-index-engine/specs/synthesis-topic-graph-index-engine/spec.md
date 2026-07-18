## ADDED Requirements

### Requirement: Topic Graph index engine SHALL use strict environment-neutral contracts

The engine SHALL expose canonical JSON-safe index requests and results with
explicit contract and algorithm versions.

#### Scenario: Unknown fields are supplied

- **WHEN** a request or result contains supported fields plus unknown JSON-safe fields
- **THEN** canonical rebuilding SHALL retain only supported camelCase fields.

#### Scenario: Invalid data is supplied

- **WHEN** input is cyclic, non-JSON, over a bound, duplicates an identifier,
  changes its request basis, or violates deterministic result ordering
- **THEN** rebuilding SHALL reject it before application use.

### Requirement: Topic Graph index engine SHALL preserve current placement semantics

The engine SHALL deterministically derive root and unplaced topic identifiers
from bounded Topic Graph node and edge inputs.

#### Scenario: Roots are derived

- **WHEN** a node is explicitly a root or has top level
- **THEN** its topic identifier SHALL appear once in the sorted roots result.

#### Scenario: Unplaced topics are derived

- **WHEN** a node is neither root nor top, is not deleted, and is not targeted
  by a non-rejected broader relation
- **THEN** its topic identifier SHALL appear once in the sorted unplaced result.

#### Scenario: Current parent status semantics are preserved

- **WHEN** a broader relation is suggested, confirmed, stale, or deleted
- **THEN** its target SHALL remain treated as parented
- **AND** only a rejected broader relation SHALL be ignored.

### Requirement: Topic Graph index engine SHALL be bounded and cancellable

The engine SHALL cap nodes at 25,000, edges at 100,000, and strings at 4,096
code units.

#### Scenario: Checkpoint aborts computation

- **WHEN** a checkpoint callback throws during index computation
- **THEN** computation SHALL stop without returning a partial result.

### Requirement: Topic Graph index engine SHALL be process-portable

The engine source SHALL not import plugin, Zotero, repository, persistence,
filesystem, runtime, DOM, or Node-only modules.

#### Scenario: Worker canary computes a result

- **WHEN** a canonical request crosses the test-only Node worker boundary
- **THEN** the rebuilt worker result SHALL equal direct in-process execution.
