## ADDED Requirements

### Requirement: Canonical execute SHALL use a closed eleven-operation union
`mutations.execute` SHALL accept exactly `item.create`, `item.updateMetadata`, `item.changeType`, `item.remove`, `item.updateTags`, `item.addRelated`, `item.removeRelated`, `collection.create`, `collection.update`, `collection.updateMembership`, and `collection.remove`. Each operation SHALL use its own closed request and result mapping; unknown or removed names SHALL fail as `unsupported_operation`.

#### Scenario: Tag state is updated
- **WHEN** a caller submits `item.updateTags` with disjoint bounded add and remove sets
- **THEN** the Host commits or confirms the complete target tag state in one mutation boundary and returns a unified result envelope

#### Scenario: Collection membership has no delta
- **WHEN** `collection.updateMembership` requests membership already satisfied by current state
- **THEN** the Host returns a confirmed `unchanged` receipt rather than an empty or unverified success

### Requirement: Canonical preview SHALL cover only three destructive operations
`mutations.preview` SHALL accept exactly `item.changeType`, permanent `item.remove`, and `collection.remove`. It SHALL be read-only, return one complete operation-specific plan and observations, and issue an opaque caller-scoped token required by the corresponding execute request.

#### Scenario: Destructive plan exceeds a hard limit
- **WHEN** a permanent removal plan cannot list every affected child, collection, membership, or managed resource within its fixed limit
- **THEN** preview fails before mutation and does not return a sampled or truncated plan

#### Scenario: Previewed state changes before execute
- **WHEN** a bound revision, descendant set, membership set, or schema plan differs at execute time
- **THEN** execute fails with a conflict before any write

### Requirement: Preview tokens SHALL be short-lived plan evidence
Preview tokens SHALL expire fifteen minutes after issuance, bind caller scope, operation, normalized semantic input, plan digest, and observed revisions, and become invalid after Host restart. They SHALL not be authorization, durable identity, single-use reservation, or mutation receipt.

#### Scenario: Equivalent plan receives a new token
- **WHEN** a caller re-previews unchanged state after token expiry
- **THEN** the new token proves the equivalent plan without causing a false idempotency conflict solely because token bytes changed

### Requirement: Mutation success SHALL use confirmed receipts
Successful accepted operations SHALL return `committed` or `unchanged`, the operation result, and a process-local receipt that binds operation identity, canonical input, actual normalized changes, and effect digest. A receipt SHALL never include local paths, raw Host objects, or unverified intended changes.

#### Scenario: Host confirms existing target state
- **WHEN** the requested state already holds and fresh validation succeeds
- **THEN** the result is `unchanged` and the receipt records only verified unchanged targets

### Requirement: Specialized writes SHALL share the mutation authority
Notes, note payloads, attachments, prepared note images, and status-tag transitions SHALL use the same reservation, revision, receipt, attempt, verification, and recovery semantics while retaining their named interfaces and domain result DTOs.

#### Scenario: Status cleanup fails after a workflow product succeeds
- **WHEN** the status-tag mutation is accepted but fails
- **THEN** the workflow maps the structured attempt to its partial diagnostic result rather than reading a warning bag or treating cleanup as successful
