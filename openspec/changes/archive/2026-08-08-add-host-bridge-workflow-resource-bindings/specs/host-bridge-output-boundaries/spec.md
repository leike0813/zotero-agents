## ADDED Requirements

### Requirement: Workflow resource paths remain Host-owned
Host Bridge SHALL resolve workflow input handles only beneath the managed upload root and SHALL finalize workflow outputs only beneath a run-scoped managed output root. External workflow contracts, queue records, receipts, diagnostics, and task projections SHALL omit absolute paths and path-like client data.

#### Scenario: Input handle resolves inside the managed root
- **WHEN** a valid bridge-upload handle is bound to a workflow input
- **THEN** the workflow runtime SHALL receive a Host-managed temporary path
- **AND** the path SHALL not be returned through the Host Bridge response

#### Scenario: Output path escapes the run root
- **WHEN** output finalization targets a path outside the current run-scoped root
- **THEN** Host Bridge SHALL reject finalization with a structured boundary error
- **AND** it SHALL not register the file for download
