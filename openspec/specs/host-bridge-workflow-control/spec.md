# host-bridge-workflow-control Specification

## Purpose
TBD - created by archiving change introduce-host-bridge-cli-interface. Update Purpose after archive.
## Requirements
### Requirement: Host Bridge lists workflows
The system SHALL expose loaded workflow summaries through the Host Bridge.

#### Scenario: Authenticated client lists workflows
- **WHEN** an authenticated client requests workflow listing
- **THEN** the bridge SHALL return workflow ids, labels, providers, source kind,
  configurability metadata, and execution availability
- **AND** the response MUST NOT expose workflow implementation internals beyond
  the public workflow metadata needed for submission.

### Requirement: Host Bridge submits workflows with explicit input
The system SHALL allow authenticated clients to submit workflow runs only when
explicit input units are provided.

#### Scenario: Explicit input workflow submission succeeds
- **WHEN** an authenticated client submits a valid `workflowId`, explicit input
  units, and optional execution options
- **THEN** the bridge SHALL execute the workflow through the existing workflow
  preparation, execution, provider, queue, and apply seams
- **AND** it SHALL return a run id, job ids, and initial task status metadata.
- **AND** the bridge SHALL require Zotero-side approval before starting the
  workflow run.

#### Scenario: Missing explicit input is rejected
- **WHEN** an authenticated client submits a workflow without explicit input
  units
- **THEN** the bridge SHALL return a structured validation error
- **AND** it MUST NOT use the current Zotero UI selection as fallback input.

### Requirement: Host Bridge exposes workflow run and task status
The system SHALL expose workflow run, active task, and recent task status
through Host Bridge read endpoints.

#### Scenario: Client reads run status
- **WHEN** an authenticated client requests a known workflow run id
- **THEN** the bridge SHALL return the run summary, job ids, request ids when
  known, task states, errors, and update timestamps
- **AND** it SHALL NOT require approval for the read-only status request.

#### Scenario: Client reads task list
- **WHEN** an authenticated client requests task listing
- **THEN** the bridge SHALL return active and recent workflow task summaries
  from task runtime and dashboard history sources
- **AND** it SHALL NOT require approval for the read-only task listing request.

