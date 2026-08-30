## ADDED Requirements

### Requirement: Run-scoped Host resources SHALL terminate with their execution owner
The workflow execution owner SHALL provide an opaque run scope to Host leaf owners and SHALL invoke idempotent terminal cleanup for every success, failure, cancellation, or preparation abort. Portable workflow input MUST NOT select, forge, or persist that trusted scope.

#### Scenario: Workflow run terminates
- **WHEN** a run that prepared managed images reaches any terminal path
- **THEN** the execution owner invokes that run scope's cleanup exactly once semantically
- **AND** later lookup of its prepared refs fails without requiring workflow cleanup code

#### Scenario: Another run presents a prepared ref
- **WHEN** a parallel or later run presents a ref owned by a different run scope
- **THEN** resolution fails with safe `invalid_ref` data
- **AND** neither run receives the other's prepared bytes or cleanup authority

### Requirement: Caller context SHALL be supplied by the execution owner
Caller-scoped Host adapters SHALL receive workflow, package, run, request, job, backend, and interaction facts from the execution seam. Workflow toast and logging DTOs MUST NOT carry trusted identity, adapter selection, UI ownership, or retention policy.

#### Scenario: Workflow writes a log or emits a toast
- **WHEN** a hook invokes a caller-scoped logging or notification adapter
- **THEN** identity and interaction mode come from the admitted execution context
- **AND** caller fields cannot impersonate another run or choose an interactive adapter

#### Scenario: Hook runtime remains v11 during staging
- **WHEN** leaf owners are complete before atomic activation
- **THEN** the execution seam continues publishing the active v11 runtime context and version
- **AND** no new raw global or Host-capable helper is injected into package hooks

