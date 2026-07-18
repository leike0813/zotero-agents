## ADDED Requirements

### Requirement: Complete canonical reads remain internal
The canonical store port SHALL return a strictly rebuilt complete current snapshot to in-process application callers while the authenticated inspect capability remains descriptor-only.

#### Scenario: Internal read does not widen inspect
- **WHEN** the application reads a ready Topic and a client invokes `topics.canonical.inspect`
- **THEN** the application receives the complete snapshot while the wire result still contains only hashes, section descriptors, and diagnostics
