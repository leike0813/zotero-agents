## ADDED Requirements

### Requirement: WebDAV maintenance adapter SHALL only translate wire representation

The WebDAV maintenance adapter SHALL validate and decode the existing public request, invoke the typed maintenance lifecycle interface, and encode the resulting transport-neutral operation view. It MUST NOT own durable admission, dispatch, control-state transitions, terminal classification, restart reconciliation, lifecycle event publication, or persistence-record projection.

#### Scenario: Public maintenance operation is read
- **WHEN** the WebDAV maintenance adapter receives a valid operation query
- **THEN** it SHALL obtain a typed view from the lifecycle interface and encode the existing public schema
- **AND** it SHALL NOT read or interpret the underlying operation record, basis, source hash, or diagnostics storage

#### Scenario: Control request uses the supported wire spelling
- **WHEN** a control request uses the strict wire-contract fields for operation ID and retry key
- **THEN** the adapter SHALL normalize it into one typed control command before lifecycle dispatch
- **AND** unsupported aliases SHALL fail validation before lifecycle dispatch
- **AND** the lifecycle SHALL receive no wire field or raw JSON shape knowledge

#### Scenario: Surface inventory is checked
- **WHEN** WebDAV and generic maintenance surface parity is validated
- **THEN** the existing operation inventory and public DTO SHALL remain unchanged
- **AND** internal lifecycle ownership SHALL NOT require a second public surface or method
