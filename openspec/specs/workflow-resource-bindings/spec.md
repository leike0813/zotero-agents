# workflow-resource-bindings Specification

## Purpose

Defines a stable external-resource contract that lets GUI, CLI, and remote workflow callers provide inputs and receive outputs without exposing Host-local paths or requiring interactive file dialogs.

## Requirements

### Requirement: Workflow manifests declare external resource requirements
Every workflow that supports non-interactive Host Bridge execution SHALL declare stable `resourceRequirements` slots. Each slot SHALL identify an id, input/output direction, file or archive kind, one-or-many cardinality, requiredness, and any MIME, extension, size, or count constraints. Workflow discovery SHALL expose whether the workflow supports `non-interactive` invocation.

#### Scenario: Client discovers a remotely runnable workflow
- **WHEN** an authenticated client requests workflow requirements
- **THEN** the response SHALL include resource slots and non-interactive support
- **AND** the response SHALL identify output delivery as `bridge-download` when applicable

#### Scenario: Interactive-only workflow is discovered
- **WHEN** a workflow does not declare non-interactive support
- **THEN** the workflow SHALL remain visible to GUI discovery
- **AND** Host Bridge runnable projections SHALL mark it unsupported with a structured reason

### Requirement: Resource bindings use opaque broker handles
Workflow validate and submit requests SHALL accept versioned `resourceBindings` with input slot values containing only broker-issued `fileId` handles and output slot values declaring an allowed delivery mode. Requests SHALL reject client paths, path-like values, unknown slots, duplicate bindings, and bindings that violate the declared cardinality or acceptance constraints.

#### Scenario: Valid input and output bindings
- **WHEN** a caller binds uploaded file handles to required input slots and requests bridge-download output delivery
- **THEN** validation SHALL succeed without opening a GUI

#### Scenario: Client supplies a local path
- **WHEN** a resource binding contains an absolute path, relative path, or path-like output destination
- **THEN** Host Bridge SHALL return a structured validation error
- **AND** it SHALL not read or write that path

### Requirement: Accepted submissions retain input resources
After a workflow submission is accepted, Host Bridge SHALL retain a process-scoped submission lease for every referenced input handle until the submission reaches a terminal state, expires, or the Host Bridge process ends. The lease SHALL cover all prepared units, survive queue delay, and be released exactly once on completion, failure, cancellation, or expiry. Transfer handles, leases, and pending workflow submissions SHALL not be restored after a Host Bridge restart.

#### Scenario: One input is reused by multiple units
- **WHEN** one accepted submission creates multiple prepared units from the same input handle
- **THEN** every unit SHALL be able to resolve the input
- **AND** the handle SHALL not be deleted after the first unit

#### Scenario: Validation fails before submission
- **WHEN** resource validation fails before admission
- **THEN** no input lease SHALL be acquired or consumed

#### Scenario: Idempotent retry is received
- **WHEN** the same submission is retried with its original idempotency identity
- **THEN** Host Bridge SHALL return the existing submission result without creating a second lease

#### Scenario: Host Bridge restarts during a resource submission
- **WHEN** Host Bridge restarts before a resource-bound submission reaches a terminal state
- **THEN** the previous upload handles, output handles, leases, and pending submission projection SHALL be unavailable
- **AND** the caller SHALL inspect any separately durable admitted run before uploading fresh inputs and creating a replacement submission

### Requirement: Runtime exposes a mediated resource view
Workflow hooks SHALL access bound inputs and create/finalize outputs through the workflow runtime resource API. The API SHALL provide only Host-managed temporary input paths and run-scoped output locations, and SHALL expose immutable slot metadata for the current execution unit.

#### Scenario: Non-interactive hook requests an input
- **WHEN** a non-interactive workflow reads a bound input slot
- **THEN** the runtime SHALL resolve the broker handle into Host-managed temporary storage
- **AND** the hook SHALL receive metadata without any client or Host absolute path in the external contract

#### Scenario: Hook requests an unbound input
- **WHEN** a hook requests a required slot without a binding
- **THEN** execution SHALL fail with a structured missing-resource error
- **AND** no picker or editor SHALL be opened

### Requirement: Non-interactive execution never opens GUI interaction
Host Bridge validate, submit, and run paths SHALL reject picker, editor, confirmation, and other GUI-only interaction requests when executing in non-interactive mode. The rejection SHALL occur before an unrecoverable wait state and SHALL include the affected workflow or resource slot.

#### Scenario: Legacy picker call occurs in a remote run
- **WHEN** a workflow hook calls a GUI file-selection API during a non-interactive run
- **THEN** the run SHALL fail deterministically with an interaction-required error
- **AND** the Zotero file picker SHALL not be shown

### Requirement: Workflow outputs are downloadable resources
Completed output slots SHALL be registered as Host Bridge workflow artifacts and returned as opaque descriptors with display name, content type, byte size, SHA-256 when available, expiry, and a download command. Directory-like output SHALL be packaged as an archive before registration.

#### Scenario: Remote workflow completes with a file output
- **WHEN** a non-interactive workflow finalizes an output slot
- **THEN** the result SHALL contain a downloadable `fileId` descriptor
- **AND** `file download` SHALL retrieve the exact bytes with existing integrity checks

#### Scenario: Output is outside the managed root
- **WHEN** a hook attempts to finalize a path outside its run-scoped output root
- **THEN** finalization SHALL fail
- **AND** no downloadable descriptor SHALL be published