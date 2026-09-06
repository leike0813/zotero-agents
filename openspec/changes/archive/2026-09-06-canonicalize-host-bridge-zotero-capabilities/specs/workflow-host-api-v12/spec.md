## MODIFIED Requirements

### Requirement: Workflow Host SHALL expose one exact v12 surface

The active Workflow Host interface SHALL preserve the existing v12 surface, including navigation and Managed Note members, and add mutations.getOperation. The manifest SHALL measure 23 top-level keys, twenty-one nested modules, and 89 callable members. Synthesis grouping keys SHALL not count as callable members. No legacy mutation alias, public handler member, public prepared token, or public expectedRevision member is permitted.

#### Scenario: Interactive projection is inspected
- **WHEN** recursive conformance inspects every top-level and nested key
- **THEN** the projection has exactly the declared 23/21/89 identity and every callable position is a function.

#### Scenario: Undeclared member is exposed
- **WHEN** composition, Broker growth, or a spread adds a top-level or nested member
- **THEN** contract conformance fails before the build can publish the projection.

### Requirement: V12 member signatures SHALL preserve closed DTO and control semantics

Every member SHALL use the exact request, result, nullability, callback, and WorkflowCallControl shape defined by the v12 contract and owner delta specs. Public request/result data SHALL be strict JSON except for the trusted in-process control value. mutations.preview SHALL cover all twenty-three canonical operations and return operation, domainPlanDigest, bounded safe plan observations, and no token or revision authority. mutations.execute SHALL accept the same closed twenty-three-operation union without public expectedRevision. mutations.getOperation SHALL explicitly project only running, settled with result, or unavailable and SHALL not execute or retry an operation.

#### Scenario: Callback-scoped member is invoked
- **WHEN** a caller invokes traversal, snapshot, archive extraction, or tag audit
- **THEN** control and callback occupy their declared parameters
- **AND** no overload interprets a request bag as control.

#### Scenario: Workflow observes a mutation
- **WHEN** a workflow calls mutations.getOperation with operation identity
- **THEN** it receives only the canonical observation union
- **AND** no write, replay, generic HTTP lookup, request data, or timestamps occur.

### Requirement: attachments.replaceFile SHALL perform staged atomic replacement

attachments.replaceFile SHALL replace stored-file or stored-URL content through trusted prepared-file input while preserving attachment identity, placement, and link mode. It SHALL validate the complete main and companion set, entry and byte limits, safe filenames, duplicate targets, and symlink policy before native effects, stage managed content, atomically switch it, and clean old managed content after commit. Failure SHALL preserve original content and the primary error; unconfirmed cleanup SHALL produce repair_required or unknown. Identical content and complete companion sets SHALL return unchanged. operationId is required; expectedRevision and linked-path source authority SHALL be rejected. Replay SHALL return stored evidence without repeating staging, swap, or cleanup. Filename and MIME identity SHALL derive from replacement content and receipts SHALL contain verified before/after facts.

#### Scenario: Stored replacement commits atomically
- **WHEN** a stored-file target receives a valid main file plus companions
- **THEN** the managed content switches atomically, the receipt records before/after attachment facts, and the old managed content is cleaned after commit.

#### Scenario: Staging validation fails before any change
- **WHEN** a companion input fails path-traversal, duplicate-target, or size validation
- **THEN** the call fails before any Zotero state changes and the original attachment file remains intact.

#### Scenario: Replacement failure preserves the original file
- **WHEN** the staged switch fails after validation
- **THEN** the attachment keeps its original file and the attempt report preserves the original failure as the primary error.

#### Scenario: Link mode mismatch is rejected
- **WHEN** a caller supplies a linked-file target or linked-path source
- **THEN** the call fails as unsupported_operation without converting the link mode.

#### Scenario: Linked relocation never touches external files
- **WHEN** a caller requests linked-file relocation
- **THEN** the call fails as unsupported_operation and neither the Zotero link nor any external file changes.

#### Scenario: Identical replacement is unchanged
- **WHEN** the replacement content hash and complete companion set equal the current stored content
- **THEN** the result outcome is unchanged with a confirmed receipt and no staging swap occurs.

#### Scenario: Cleanup cannot be confirmed
- **WHEN** the new content committed but old managed content cleanup cannot be confirmed
- **THEN** the outcome is repair_required or unknown with residual evidence and is not reported as full success.

## ADDED Requirements

### Requirement: Workflow mutations SHALL preserve canonical lifecycle and effect contracts

Workflow mutation projection SHALL preserve all-write preview, private preflight, durable admission before effect, 30-day retention of ordinary terminal evidence, permanent expired-identity protection, and receipt/attempt classification. It SHALL expose Broker list limits, relatedRefs semantics, explicit Trash duplicate rejection, one-transaction native Trash/restore, stored-only prepared-file replacement, and explicit-collection ingest. Ingest required-core failure SHALL compensate only invocation-created effects and optional enrichment SHALL preserve clean failure or residual/unknown classification. Existing navigation and Managed Note semantics remain unchanged.

#### Scenario: Workflow previews a write
- **WHEN** a workflow previews attachments.create, notes.upsertPayload, trash.setItemsState, literature.ingest, or another canonical mutation
- **THEN** it SHALL receive the same effect-free preview contract as Bridge and CLI.

#### Scenario: Workflow submits duplicate Trash refs
- **WHEN** a workflow submits repeated explicit Trash refs
- **THEN** the mutation SHALL fail as invalid_request before reservation or native transaction.

#### Scenario: Workflow observes expired identity
- **WHEN** ordinary terminal evidence has expired
- **THEN** mutations.getOperation SHALL return unavailable
- **AND** resubmission with that identity SHALL not dispatch another effect.

### Requirement: Stored attachment replacement SHALL use trusted prepared files

attachments.replaceFile SHALL replace content only for stored-file and stored-URL targets through trusted prepared-file input. It SHALL reject linked-file, linked-URL, note-image, note-payload, and linked-path source forms as unsupported_operation. Stored replacement SHALL validate and stage complete content before the first Zotero effect, preserve original content on failure, and classify unconfirmed cleanup as repair_required or unknown attempt evidence. operationId is required and expectedRevision is rejected.

#### Scenario: Linked relocation is rejected
- **WHEN** a linked-file target or linked-path source is supplied
- **THEN** the call fails as unsupported_operation and neither external file nor Zotero link changes.
