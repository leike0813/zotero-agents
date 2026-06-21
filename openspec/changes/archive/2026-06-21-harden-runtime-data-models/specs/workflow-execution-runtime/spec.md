## ADDED Requirements

### Requirement: Job records MUST expose typed core runtime metadata

Workflow execution job records MUST expose a stable core metadata contract for workflow, backend, provider, request, run, sequence, and SkillRunner lifecycle correlation fields.

#### Scenario: Job enqueue preserves core metadata

- **WHEN** workflow execution enqueues a job with backend, provider, request kind, run, and workflow metadata
- **THEN** the stored job record SHALL expose those fields through the typed job metadata contract
- **AND** task projection and runtime logging SHALL read the same field names.

#### Scenario: Provider progress updates request identity

- **WHEN** provider progress reports a backend request id for a running job
- **THEN** the job metadata SHALL preserve the request id in the core metadata contract
- **AND** subsequent runtime log, task dashboard, and reconciliation paths SHALL be able to correlate by that request id.

#### Scenario: Workflow-specific metadata remains extensible

- **WHEN** a workflow or provider attaches metadata outside the governed core field set
- **THEN** the job record SHALL preserve that metadata
- **AND** the existence of extension metadata SHALL NOT weaken the typed core fields.

### Requirement: SkillRunner lifecycle metadata MUST remain stable across queue and reconciliation paths

SkillRunner lifecycle metadata carried by job records MUST use stable field names across job queue failures, recoverable request handling, task projection, and reconciler settlement.

#### Scenario: Pre-ready failure records lifecycle diagnostics

- **WHEN** a SkillRunner job fails before request-ready
- **THEN** the job metadata SHALL preserve request readiness, submit phase, and submit error fields
- **AND** task projection SHALL be able to show the failed lifecycle state without inspecting provider-private objects.

#### Scenario: Recoverable request keeps correlation fields

- **WHEN** a SkillRunner request is recoverable after backend request creation
- **THEN** the job metadata SHALL retain backend id, backend type, provider id, run id, and request id
- **AND** reconciler-owned paths SHALL use those fields without relying on ad hoc unknown-map casts.
