## MODIFIED Requirements

### Requirement: Related-items sync is stale-marked by sidecar changes

Synthesis SHALL mark related-items sync stale when sidecar changes may affect accepted library-to-library citation facts, without requiring current Citation Graph rows to already contain those facts.

#### Scenario: Digest apply marks related-items stale

- **WHEN** literature-digest apply updates sidecar facts for one source ref
- **THEN** related-items sync SHALL be marked stale for that source ref
- **AND** no related-items sync operation SHALL run during apply.

#### Scenario: Reference Sidecar refresh marks related-items stale

- **WHEN** Reference Sidecar refresh changes references artifact state for source refs
- **THEN** related-items sync SHALL be marked stale for those changed source refs
- **AND** no related-items sync operation SHALL run during Reference Sidecar refresh.

### Requirement: Related-items sync follows manual graph refresh

Related-items sync SHALL run after successful manual Citation Graph stale refresh, scoped to the final affected source refs returned by the graph refresh.

#### Scenario: Graph refresh returns source scope

- **WHEN** manual Citation Graph stale refresh expands canonical or binding deltas into affected source refs
- **THEN** the follow-up related-items sync SHALL use those affected source refs
- **AND** it SHALL NOT fall back to a full-library sync because source refs were omitted from the original stale delta.

#### Scenario: Graph refresh is skipped or failed

- **WHEN** manual Citation Graph stale refresh is skipped or fails
- **THEN** related-items sync SHALL NOT run as part of that command.
