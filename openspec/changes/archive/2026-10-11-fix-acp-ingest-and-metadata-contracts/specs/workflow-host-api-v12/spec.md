## MODIFIED Requirements

### Requirement: Workflow mutations SHALL preserve canonical lifecycle and effect contracts

Workflow mutation projection SHALL preserve all-write preview, private preflight, durable admission before effect, 30-day retention of ordinary terminal evidence, permanent expired-identity protection, and receipt/attempt classification. It SHALL expose Broker list limits, relatedRefs semantics, explicit Trash duplicate rejection, one-transaction native Trash/restore, stored-only prepared-file replacement, and ingest with optional library and collection destinations. Ingest required-core failure SHALL compensate only invocation-created effects and optional enrichment SHALL preserve clean failure or residual/unknown classification. Existing navigation and Managed Note semantics remain unchanged.

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

#### Scenario: Workflow ingests at the library root
- **WHEN** a workflow omits collectionRef from literature.ingest
- **THEN** the canonical explicit or personal library destination and not_requested membership outcome SHALL be preserved.
