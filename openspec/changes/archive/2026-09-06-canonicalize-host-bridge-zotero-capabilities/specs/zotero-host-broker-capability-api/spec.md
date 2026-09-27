## REMOVED Requirements

### Requirement: Controlled mutation command API
**Reason**: Public handler delegation lacks a canonical all-write preflight, durable admission, and terminal-evidence boundary.
**Migration**: Use the canonical mutation lifecycle below.

### Requirement: Canonical execute SHALL use a closed eleven-operation union
**Reason**: The current canonical mapping contains twenty-three operations.
**Migration**: Use the closed twenty-three-operation union below.

### Requirement: Canonical preview SHALL cover only three destructive operations
**Reason**: Every canonical write requires effect-free preview and private preflight.
**Migration**: Preview each canonical operation through the all-write contract below.

### Requirement: Preview tokens SHALL be short-lived plan evidence
**Reason**: Tokens and leases are private trusted preparation data, not public fields.
**Migration**: Use the private prepared-evidence contract below.

### Requirement: Mutation success SHALL use confirmed receipts
**Reason**: Process-local receipts cannot establish cross-restart terminal evidence.
**Migration**: Use durable receipts and attempts below.

### Requirement: Mutation admission SHALL reject unsupported operations and retry SHALL form successor attempts
**Reason**: A terminal identity must remain immutable and non-replayable.
**Migration**: Observe existing evidence or submit a new caller intent.

### Requirement: Broker attachment file replacement SHALL preserve original content on failure
**Reason**: Linked relocation and public path authority are removed.
**Migration**: Use prepared-file replacement for stored attachment content only.

### Requirement: Literature ingest may attach landing URL when PDF is missing
**Reason**: Required collection rollback and optional-enrichment residual classification must be explicit.
**Migration**: Use the required-core and optional-enrichment contract below.

## ADDED Requirements

### Requirement: Canonical mutations SHALL use a closed twenty-three-operation union

The Broker SHALL expose exactly item.create, item.updateMetadata, item.changeType, item.remove, item.updateTags, item.addRelated, item.removeRelated, collection.create, collection.update, collection.updateMembership, collection.remove, notes.create, notes.updateContent, notes.remove, notes.upsertPayload, attachments.create, attachments.updateMetadata, attachments.replaceFile, attachments.move, attachments.remove, statusTags.transition, trash.setItemsState, and literature.ingest. Each operation SHALL have a closed strict-JSON request/result mapping. Legacy names, handler-shaped aliases, batch ingest, and unknown operations SHALL fail as unsupported_operation before admission or Host effects. Existing Managed Note semantics remain unchanged in this change.

#### Scenario: Removed operation is submitted
- **WHEN** a caller submits a legacy, handler-shaped, batch, or unknown operation
- **THEN** the Broker SHALL reject it as unsupported_operation
- **AND** it SHALL create neither identity evidence nor a Host effect.

### Requirement: Every canonical mutation SHALL support effect-free preview and private preflight

Each of the twenty-three operations SHALL support effect-free public preview and private execution preflight. Preview SHALL not require operationId and SHALL return operation, domainPlanDigest, bounded safe plan observations, and would_change or unchanged. Private preflight SHALL capture normalized semantic input, caller scope, effect scope, current revision/state/basis, and prepared-file identity, size, and SHA-256 facts where needed. Public DTOs SHALL reject expectedRevision, prepared tokens, leases, local paths, storage paths, and raw Host authority. Execute SHALL revalidate private prepared facts within the admitted native slice and SHALL not silently refresh after drift.

#### Scenario: Non-destructive write is previewed
- **WHEN** a caller previews notes.upsertPayload, attachments.create, trash.setItemsState, literature.ingest, or another canonical write
- **THEN** the Broker SHALL return that operation's complete bounded safe plan facts
- **AND** it SHALL not change Zotero data.

#### Scenario: Prepared facts drift before effect
- **WHEN** current revisions, state, basis, or prepared-file facts differ during execution revalidation
- **THEN** the Broker SHALL fail before the Host effect with a typed reevaluation outcome
- **AND** it SHALL not silently prepare a replacement plan and continue.

### Requirement: Private prepared evidence SHALL bind trusted execution

Prepared tokens and file leases SHALL be private short-lived trusted execution evidence. They SHALL not appear in public schemas, approval UI, transcripts, audit output, receipts, attempts, errors, configuration, or durable identity. After approval wait or restart, trusted execution SHALL run fresh preflight; existing approval may continue only when domainPlanDigest is unchanged.

#### Scenario: Approval wait changes the plan
- **WHEN** fresh preflight after approval produces a different domainPlanDigest
- **THEN** the earlier approval SHALL not authorize the effect
- **AND** the adapter SHALL present the changed plan for approval.

### Requirement: Canonical mutation admission and evidence SHALL be durable

Before the first Host effect, the Broker SHALL durably bind caller scope, operationId, operation kind, and normalized semantic digest. Admission failure SHALL prevent all Host effects. An identical binding returns live observation or stored terminal evidence without dispatch; a different binding fails with conflict. Required effects complete only with committed or unchanged durable receipt evidence. Failed, canceled, unknown, and repair_required outcomes are attempts and never partial receipts. Failure to persist terminal success evidence after a Host effect yields unknown evidence. Known committed, unchanged, failed, and canceled evidence SHALL be retained for 30 days; unknown and repair_required evidence SHALL not age-expire. On ordinary evidence expiry, minimum binding remains permanently: identical input returns outcome_unavailable, different input conflict, and the identity cannot execute again.

#### Scenario: Durable admission fails
- **WHEN** identity admission cannot be durably recorded
- **THEN** the mutation SHALL fail before every Host effect.

#### Scenario: Terminal evidence persistence fails
- **WHEN** required Host effects finish but durable terminal evidence cannot be recorded
- **THEN** the Broker SHALL return unknown attempt evidence
- **AND** it SHALL not report committed success.

#### Scenario: Terminal failure is resubmitted
- **WHEN** a caller resubmits failed, canceled, unknown, or repair_required evidence with the same identity and semantic input
- **THEN** the Broker SHALL return stored terminal evidence
- **AND** it SHALL not dispatch a successor under that identity.

### Requirement: Canonical mutation observation SHALL return only state and result

mutations.getOperation SHALL be read-only and return exactly running, settled with result, or unavailable. Running means a current-process live execution. Settled contains a durable receipt or attempt result. Unavailable does not prove no effect. Storage failure SHALL fail the call with a typed error rather than add a returned state. Observation SHALL not execute, replay, infer historical outcome from current items, or return request data, timestamps, semantic input, caller scope, or identity-binding details.

#### Scenario: Started record is observed after restart
- **WHEN** durable admission exists after restart without terminal evidence
- **THEN** observation SHALL return settled with an unknown attempt result
- **AND** it SHALL not report running or replay the operation.

#### Scenario: Ordinary evidence has expired
- **WHEN** 30-day evidence is no longer retained
- **THEN** observation SHALL return unavailable
- **AND** it SHALL not disclose retained binding details.

### Requirement: List mutations and native Trash SHALL be bounded and atomic

Canonical portable target lists SHALL allow at most 100 normalized explicit targets and at most 100 expanded actual targets. Related operations SHALL accept one source plus relatedRefs, normalize and deduplicate related targets, reject self-reference, cross-library, and inactive targets, and return one operation's relation facts. Add/remove conflicts SHALL fail as invalid_request before deduplication. Explicit Trash targets SHALL be unique; duplicates SHALL fail as invalid_request. trash.setItemsState SHALL accept one library's 1–100 regular item, note, or attachment refs and state trashed or active, rejecting collections and annotations. It SHALL validate targets and expansion before one native transaction, record actual changes, and use native semantics: trash marks explicit targets; parent-only restore restores parent plus trashed direct notes/attachments; parent plus explicit children restores only those; child-only restores only that child.

#### Scenario: Trash has explicit duplicate refs
- **WHEN** trash.setItemsState includes a repeated item ref
- **THEN** the Broker SHALL fail as invalid_request before reservation or transaction.

#### Scenario: Restore expansion exceeds the limit
- **WHEN** native restore expansion would change more than 100 targets
- **THEN** the Broker SHALL fail as resource_limited without truncation or automatic batching.

#### Scenario: Parent-only restore succeeds
- **WHEN** a trashed parent is restored without explicit child refs
- **THEN** one native transaction SHALL restore the parent and its trashed direct notes and attachments
- **AND** the receipt SHALL list the actual changed refs.

### Requirement: Prepared-file replacement SHALL preserve original stored content

Attachment replacement SHALL accept trusted prepared-file input only for stored-file and stored-URL targets. It SHALL validate complete source and companions before touching Zotero state, stage managed content, atomically switch stored content, and clean up only after commit. Linked-file, linked-URL, embedded-image, note-payload, and linked-path source forms SHALL fail as unsupported_operation. Any failure preserves original content and primary error; unconfirmed cleanup is repair_required or unknown attempt evidence. Terminal replay SHALL not repeat staging, swap, or cleanup.

#### Scenario: Linked relocation is requested
- **WHEN** a caller targets a linked-file attachment or provides a linked-path source
- **THEN** the Broker SHALL fail as unsupported_operation before filesystem or Zotero mutation.

### Requirement: Literature ingest SHALL commit required core effects and classify optional enrichment

Literature ingest SHALL require creation or verified reuse of the typed bibliographic item and membership in one explicit valid collection. If a required effect fails, the Broker SHALL restore preexisting state and remove only objects created by that invocation; it SHALL never remove a reused item or preexisting collection membership. PDF and landing attachment work are optional enrichment. A clean optional failure with no residual or uncertainty SHALL preserve core committed or unchanged evidence and report its failed or canceled enrichment attempt. Any residual or uncertain optional effect SHALL be repair_required or unknown and include bounded affected/residual refs.

#### Scenario: Required collection membership fails
- **WHEN** ingest creates an item but cannot establish requested collection membership
- **THEN** it SHALL remove only the invocation-created item and restore prior state
- **AND** it SHALL return attempt evidence rather than a core receipt.

#### Scenario: Optional enrichment leaves residual work
- **WHEN** optional PDF or landing work cannot be fully compensated or verified
- **THEN** output SHALL classify it as repair_required or unknown with residual evidence
- **AND** it SHALL not suppress the enrichment outcome.
