## ADDED Requirements

### Requirement: Planner output SHALL use the canonical structural contract

Planner Skill output and TypeScript requests SHALL use the production Topic Plan payload contract, including selectors, evidence, scope, revision and collection limits. The producer SHALL use tag.and/or/not and combine. Unsupported selector aliases SHALL fail without automatic conversion.

#### Scenario: A producer emits invented selector keys

- **WHEN** output contains includeTags, excludeTags, match or strategy
- **THEN** final output structural validation rejects it before workflow apply
- **AND** no Synthesis mutation occurs

#### Scenario: A canonical nonempty plan is applied

- **WHEN** planner output passes shared structure validation and its graph basis is current
- **THEN** the real hook reaches the native application and preserves accepted plan facts across reopen
- **AND** the Python coverage and CAS checks remain independent domain validation
