# workflow-execution-runtime Delta

## ADDED Requirements

### Requirement: Sequence step apply contexts

The workflow runtime SHALL make successful `skillrunner.sequence.v1` step
results available to workflow `applyResult` hooks.

#### Scenario: Apply hook reads intermediate step result

- **GIVEN** a sequence workflow completes multiple steps
- **WHEN** applyResult is invoked
- **THEN** the hook can access each step request id, provider result,
  bundleReader, and resultContext.

### Requirement: ACP-only sequence dispatch

`skillrunner.sequence.v1` workflow execution SHALL fail closed when the selected
backend is not ACP.

#### Scenario: Non-ACP backend selected

- **GIVEN** a sequence workflow is prepared with a non-ACP backend
- **WHEN** execution starts
- **THEN** the workflow is rejected before launching any step.
