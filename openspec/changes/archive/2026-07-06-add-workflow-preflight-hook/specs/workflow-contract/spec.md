## MODIFIED Requirements

### Requirement: Workflow manifests declare executable hooks

Workflow manifests SHALL declare workflow-owned hook modules through `hooks`.

#### Scenario: Manifest declares optional preflight hook

- **WHEN** a workflow manifest declares `hooks.preflight`
- **THEN** the loader SHALL load a module export named `preflight`
- **AND** the manifest SHALL remain invalid if the hook file or export is missing.

#### Scenario: Preflight is not a visibility hook

- **WHEN** workflow menus, debug classification, or host readiness checks evaluate workflow availability
- **THEN** they SHALL continue to use manifest selection policy and validation metadata
- **AND** they SHALL NOT execute `hooks.preflight`.

### Requirement: Workflow provider determines compatible backend types

Workflow execution MUST derive compatible backend profile types from top-level
`provider` only. `request.kind` MUST describe request protocol/shape and MUST
NOT infer backend compatibility.

#### Scenario: Preflight does not affect backend compatibility

- **WHEN** a workflow declares `hooks.preflight`
- **THEN** compatible backend profile resolution SHALL still follow the top-level provider
- **AND** preflight outcomes SHALL NOT change provider/backend compatibility.

### Requirement: Workflow request construction has a single request source

Provider request payloads SHALL be produced only by declarative request
compilation or `hooks.buildRequest`.

#### Scenario: Preflight context informs buildRequest

- **WHEN** preflight returns context for an input unit
- **THEN** the runtime SHALL pass that context to `buildRequest`
- **AND** `buildRequest` SHALL remain responsible for returning the provider request payload.

#### Scenario: Selection context is not mutated by preflight

- **WHEN** preflight returns context or replacement units
- **THEN** the runtime SHALL keep preflight metadata separate from `selectionContext`
- **AND** downstream hooks SHALL be able to distinguish original input facts from preflight execution plan facts.
