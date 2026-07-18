## ADDED Requirements

### Requirement: Workflow trace ownership uses the canonical top-level execution

When Workflow semantic trace capture is armed, `runWorkflowExecutionSeam` SHALL use canonical `runState.runId` as the only eligible recording root and SHALL propagate a transient parent recording context to concrete ordinary and sequence ACP requests. Request, job, sequence, and Host Bridge identifiers SHALL NOT substitute for or replace that root.

#### Scenario: Multi-job execution runs
- **WHEN** one top-level execution dispatches multiple concurrent or serial ACP requests
- **THEN** every request activity SHALL belong to one root identified by `runState.runId`.

#### Scenario: Sequence execution runs
- **WHEN** multiple concrete ACP sequence stages execute
- **THEN** all stages SHALL share the parent workflow recording root
- **AND** their existing composite run and Host Bridge identities SHALL remain unchanged.

### Requirement: Workflow trace completion follows execution idle

Only a new top-level execution containing at least one executable ACP request SHALL claim an armed Workflow recording. Concrete request terminals SHALL close their own registered activities but SHALL NOT infer root completion. The execution SHALL aggregate succeeded, failed, or canceled outcome after all jobs and requests settle, finish the unique root, and freeze capture before the business apply seam continues.

#### Scenario: Execution has no ACP request
- **WHEN** preparation halts or a workflow contains no executable ACP request
- **THEN** it SHALL NOT claim the armed recorder.

#### Scenario: Recovered request is reconciled
- **WHEN** startup or historical request recovery publishes lifecycle state
- **THEN** it SHALL NOT claim a newly armed recorder.

#### Scenario: A request fails
- **WHEN** all execution activity is closed and the aggregate business outcome is failed or canceled
- **THEN** the trace MAY still be capture-complete
- **AND** its root end SHALL preserve that business outcome.
