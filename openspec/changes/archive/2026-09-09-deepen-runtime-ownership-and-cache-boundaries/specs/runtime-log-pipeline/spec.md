## MODIFIED Requirements

### Requirement: Workflow logging adapter SHALL bind trusted identity and bounded data
The Workflow logging owner SHALL accept only level, stage, message, optional operation and phase, and optional strict-JSON details. It SHALL own caller-input validation, trusted workflow identity binding, and Workflow-specific sanitization before submitting a normalized entry. The runtime log pipeline SHALL own normalized storage, retention, persistence, and observation without depending on Workflow Host definitions. The Host MUST reject caller-supplied identity or retention fields and sanitize secrets, paths, native errors, stacks, and transport locations before storage.

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

#### Scenario: Runtime log core is used without Workflow Host
- **WHEN** a non-Workflow producer submits an already normalized runtime log entry
- **THEN** the runtime log pipeline SHALL apply its storage, retention, persistence, and observation rules
- **AND** loading the pipeline SHALL NOT require Workflow Host composition or caller DTO validation.
