## ADDED Requirements

### Requirement: Tag Vocabulary engine SHALL remain environment-neutral

The production Tag Vocabulary engine dependency graph SHALL exclude plugin runtime, Zotero, repository, persistence, canonical foundation, Host Capability, and Node-only modules.

#### Scenario: Engine boundary is checked

- **WHEN** Synthesis invariant and service-boundary checks inspect the Tag Vocabulary engine and application adapter
- **THEN** only the application adapter SHALL import application persistence or composition modules
- **AND** the engine package SHALL remain independently type-checkable.
