## ADDED Requirements

### Requirement: Direct export SHALL reuse canonical materialization and archive owners
Direct paper and Topic export SHALL consume the same resolved-paper materializer, canonical artifact-set source, archive writer, and output publisher as Workflow Host research bundles while preserving their existing selection, Topic digest subset, warning, delivery, and manifest semantics.

#### Scenario: Direct paper export requests the full artifact set
- **WHEN** explicit papers are exported directly
- **THEN** the materializer requests the canonical complete paper artifact set and the archive owner publishes one atomic bundle

#### Scenario: Topic export uses its intentional subset
- **WHEN** a Topic bundle is exported
- **THEN** the existing Topic report and digest-only artifact policy remains unchanged rather than inheriting all paper artifacts

### Requirement: Direct export SHALL not capture runtime state
Cached direct-export composition MAY capture callbacks but MUST resolve current filesystem, Synthesis, and output-resource adapters for every invocation.

#### Scenario: Runtime changes between exports
- **WHEN** two exports run through one cached composition with different current adapters
- **THEN** each export uses the adapter resolved for its own invocation
