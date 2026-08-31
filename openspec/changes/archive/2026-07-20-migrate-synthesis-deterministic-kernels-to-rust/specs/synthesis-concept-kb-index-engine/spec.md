## ADDED Requirements

### Requirement: Concept KB private compute SHALL use explicit Rust semantics
Concept, sense, alias, search, overlay, query-match, and ambiguity ordering SHALL use explicit UTF-16 comparison and SHALL execute in Rust for the private sidecar while the TypeScript engine remains the production plugin implementation and oracle.

#### Scenario: Large Concept KB is indexed or queried
- **WHEN** a canonical Concept KB request crosses multiple worker pages
- **THEN** Rust SHALL preserve exact search, overlay, definition precedence, match, sense, and ambiguity semantics
- **AND** the service SHALL publish only the complete strictly rebuilt result.

