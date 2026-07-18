## ADDED Requirements

### Requirement: Exactly one production engine crosses the sidecar worker boundary
Static governance SHALL allow only Citation Graph layout computation to use the
production sidecar worker and SHALL keep the other seven engines in process.

#### Scenario: Service migration inventory is checked
- **WHEN** production engine ownership is validated
- **THEN** Citation Graph layout is `sidecar_worker` with `production_worker: true`
- **AND** the other seven engines remain `in_process` with `production_worker: false`

#### Scenario: Production fallback is checked
- **WHEN** production layout composition is scanned
- **THEN** no in-process layout import, invocation, retry, or fallback branch exists

### Requirement: Production routing does not expand sidecar authority
The sidecar worker SHALL remain unable to access Synthesis repositories,
canonical files, Host capabilities, Zotero globals, or child processes.

#### Scenario: Boundary governance runs after production routing
- **WHEN** sidecar service and worker imports are inspected
- **THEN** existing authority deny rules still pass
- **AND** `108 methods / 1 direct consumer` and `mutationEnabled: false` remain unchanged

