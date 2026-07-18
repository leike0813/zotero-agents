## ADDED Requirements

### Requirement: Topic Graph index engine SHALL remain environment-neutral

The production Topic Graph index engine dependency graph SHALL exclude plugin
runtime, Zotero, repository, persistence, canonical foundation, Host
Capability, filesystem, DOM, and Node-only modules.

#### Scenario: Boundaries are inspected

- **WHEN** Synthesis invariant and service-boundary checks inspect the engine
  and application adapter
- **THEN** engine source SHALL contain only environment-neutral computation
- **AND** storage and projection compatibility mapping SHALL remain in the
  application adapter.
