## ADDED Requirements

### Requirement: Native Topics SHALL preserve planned topic lifecycle
The native Topics surface SHALL expose planned, stale, and materialized lifecycle states with definition, scope, resolver identity, revision, basis, provenance, and planning payload. Plan application SHALL use compare-and-set revision semantics and SHALL not create provisional topic memberships.

#### Scenario: Workflow applies a current topic plan
- **WHEN** a workflow reads planning context and applies a plan against the same revision
- **THEN** the native surface persists the planned topic metadata and returns the new revision
- **AND** no topic membership is materialized until the authoritative materialization operation succeeds

#### Scenario: Workflow applies a stale topic plan
- **WHEN** the expected planning revision no longer matches
- **THEN** plan application fails with a stable conflict result without changing the current plan

#### Scenario: Caller filters planned topics
- **WHEN** the caller lists workflow topic options with the `planned` filter
- **THEN** only planned lifecycle options are returned through the cross-language client contract

### Requirement: Native discovery SHALL preserve screening outcomes
Discovery application SHALL ingest candidate source-membership facts and persist accepted, screened-out, and superseded outcomes with their basis. A changed basis SHALL reopen a previously screened-out candidate for evaluation.

#### Scenario: Candidate remains on the same basis
- **WHEN** a screened-out candidate is rediscovered with the same basis
- **THEN** the native surface preserves its screening outcome

#### Scenario: Candidate basis changes
- **WHEN** a screened-out candidate is rediscovered with a different basis
- **THEN** its lifecycle returns to open while preserving the new basis

