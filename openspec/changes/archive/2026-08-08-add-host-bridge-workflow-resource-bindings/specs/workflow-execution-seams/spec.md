## ADDED Requirements

### Requirement: Workflow execution seams carry an immutable resource view
Preparation, prepared-unit, run, apply, and sequence-step apply seams SHALL carry the resource bindings needed by the current unit through an explicit immutable handoff. Hooks SHALL consume the resource runtime API rather than transport-specific picker calls when a non-interactive binding is present.

#### Scenario: Queued unit resolves its resource after admission
- **WHEN** a prepared unit is admitted from the Host queue
- **THEN** the run seam SHALL receive its resource view and resolve inputs immediately before hook execution
- **AND** queue preparation SHALL not embed a client or Host absolute path

#### Scenario: GUI adapter supplies the same resource view
- **WHEN** a GUI workflow selects an input or output destination
- **THEN** the adapter SHALL normalize it into the runtime resource view
- **AND** existing interactive workflow behavior SHALL remain observable

### Requirement: Non-interactive hooks have deterministic interaction failures
When execution is non-interactive, the workflow runtime SHALL reject picker, editor, confirmation, and equivalent GUI-only requests with a structured interaction-required outcome.

#### Scenario: Picker is requested by a remote workflow
- **WHEN** a non-interactive hook requests a file or directory picker
- **THEN** the hook SHALL fail without opening Zotero UI
- **AND** the workflow result SHALL identify the interaction boundary that was reached
