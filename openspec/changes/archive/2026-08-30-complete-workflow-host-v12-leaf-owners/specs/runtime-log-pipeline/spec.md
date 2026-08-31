## ADDED Requirements

### Requirement: Workflow logging adapter SHALL bind trusted identity and bounded data
The workflow logging adapter SHALL accept only level, stage, message, optional operation and phase, and optional strict-JSON details. The Host MUST bind workflow, package, run, request, job, backend, and timestamp facts from trusted context; reject caller-supplied identity or retention fields; and sanitize secrets, paths, native errors, stacks, and transport locations before the existing runtime log pipeline stores the entry.

#### Scenario: Workflow appends a valid log entry
- **WHEN** a workflow submits bounded portable logging data
- **THEN** the runtime pipeline stores a sanitized entry with Host-bound run identity
- **AND** the caller cannot override timestamp or execution identity

#### Scenario: Workflow log input is unsafe or too large
- **WHEN** stage, operation, or phase exceeds 128 characters, message exceeds 16 KiB UTF-8, details exceed depth 8, 512 nodes, or 64 KiB serialized, or details are not strict JSON
- **THEN** the adapter fails with stable `invalid_request` or `resource_limited` data
- **AND** no unsanitized partial entry is stored

#### Scenario: Non-interactive workflow logs
- **WHEN** a non-interactive workflow submits a valid log request
- **THEN** logging remains available and uses the same trusted binding and sanitization path

### Requirement: Test probes SHALL remain outside the workflow logging contract
Performance-span and leak-artifact probe controls SHALL be available only through an internal harness seam and MUST NOT be exposed by the workflow logging adapter.

#### Scenario: Workflow attempts to invoke a probe control
- **WHEN** workflow code addresses a performance or leak-probe test member
- **THEN** no such member exists on the workflow logging contract
- **AND** ordinary bounded logging remains available

