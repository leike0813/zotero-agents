# synthesis-application-foundation Specification

## Purpose

Define environment-neutral application ownership for Citation and Reference orchestration.

## Requirements

### Requirement: Citation and Reference orchestration SHALL have environment-neutral typed owners
The application package SHALL own private typed Citation Graph, Reference Refresh, and Reference Matching/Review orchestration, strict bounded reads, lifecycle admission, and result projection without Node, Zotero, Host, UI, service, or production persistence imports.

#### Scenario: Private compositions share application behavior
- **WHEN** Node-oracle and Rust-candidate compositions execute equivalent fixture inputs
- **THEN** each uses its own typed application owner and equivalent observable behavior
- **AND** no production route or fallback is introduced.

### Requirement: Topic application projection SHALL preserve fixed-baseline readiness

Topic apply, list, detail, patch, and reopen behavior SHALL preserve definition, resolver, paper-set, dependency-snapshot, completeness, freshness, stale/dirty reason, missing-section, and discovery-readiness facts defined by the fixed executable baseline. Page projection SHALL use bounded batched artifact reads.

#### Scenario: Empty patch is applied to an existing Topic
- **WHEN** an existing Topic receives a patch that omits definition, resolver, and paper-set changes
- **THEN** those facts remain unchanged
- **AND** readiness is recomputed from the preserved dependency state

#### Scenario: Topic page is projected
- **WHEN** a bounded Topic page contains references to digest, reference, or citation-analysis artifacts
- **THEN** the application resolves those artifacts in bounded batches rather than one query per Topic
