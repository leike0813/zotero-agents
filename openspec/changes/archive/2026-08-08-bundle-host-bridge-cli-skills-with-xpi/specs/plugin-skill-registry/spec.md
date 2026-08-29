## ADDED Requirements

### Requirement: Registry SHALL exclusively select validated XPI-bundled Host Bridge Skills
The registry SHALL derive the reserved Host Bridge Skill IDs from the surface closure and SHALL select those IDs only from a successfully validated `xpi-bundled` root. Official, development-local, and user packages with a reserved ID SHALL be excluded with structured source diagnostics and SHALL never be used as fallback when the bundle is absent or invalid. Existing precedence SHALL remain unchanged for all other Skill IDs.

#### Scenario: Competing reserved sources exist
- **WHEN** official, development-local, or user roots contain a reserved Host Bridge Skill ID
- **THEN** the registry excludes every competing candidate, reports its reserved-source diagnostic, and selects the validated XPI copy

#### Scenario: XPI bundle is invalid
- **WHEN** the plugin bundle cannot be materialized or validated
- **THEN** no reserved Host Bridge Skill is registered from any source
- **AND** plugin startup continues with a diagnostic

#### Scenario: User overrides a normal Skill
- **WHEN** a valid user Skill has the same non-reserved ID as an official Skill
- **THEN** the existing user-over-official precedence remains in effect

### Requirement: Plugin SHALL materialize bundled Skills transactionally before registry scan
The plugin SHALL verify the packaged bundle through the same asset resolver used for XPI and development resources, then stage and atomically replace a dedicated runtime root before the first registry scan. An unchanged aggregate digest SHALL be reusable. Failed staging SHALL retain prior bytes only for diagnosis and SHALL not register them as current.

#### Scenario: Bundle digest is unchanged on restart
- **WHEN** startup finds an already materialized bundle with the current aggregate digest
- **THEN** it reuses that root without rewriting it and proceeds to registry scan

#### Scenario: Replacement fails
- **WHEN** validation or transactional replacement fails after staging begins
- **THEN** the failed staging tree is not selected and the previous tree is not admitted as the current bundle
