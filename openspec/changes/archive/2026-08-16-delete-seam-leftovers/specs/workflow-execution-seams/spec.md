## ADDED Requirements

### Requirement: Execution seam modules SHALL expose one name per concept

Execution seam modules SHALL NOT export aliases or internal-only helpers when
deleting the export moves no complexity into callers.

#### Scenario: Internal concurrency predicate stays private

- **WHEN** the full-parallel provider predicate is used
- **THEN** it SHALL remain a private helper inside the concurrency module
- **AND** SHALL NOT be part of the module interface

#### Scenario: Result envelope exposes one unwrap entry point

- **WHEN** workflow result JSON is normalized
- **THEN** callers SHALL use `unwrapSkillRunnerResultJson`
- **AND** no canonicalize alias SHALL exist

#### Scenario: Request metadata exposes one task-name resolver

- **WHEN** an input unit label is needed
- **THEN** callers SHALL use `resolveTaskNameFromRequest`
- **AND** no label alias SHALL exist
