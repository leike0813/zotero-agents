## MODIFIED Requirements

### Requirement: Host Bridge write auto-approval is scoped to an ACP run

With global automatic approval disabled, Host Bridge mutation execution SHALL
skip Zotero approval only when the current ACP run profile scope is trusted for
write auto-approval by the ACP run store.

#### Scenario: Registered auto-approved run executes a mutation

- **WHEN** a mutation request carries an ACP run scope with
  `autoApproveWrites: true`
- **AND** that run id has an ACP run record whose Host Bridge CLI state declares
  write auto-approval
- **THEN** the Host Bridge SHALL execute the mutation without requesting UI
  approval.

#### Scenario: Scope header is forged

- **WHEN** a mutation request carries `autoApproveWrites: true` for an
  unregistered run id
- **AND** global automatic approval is disabled
- **THEN** the Host Bridge SHALL require the normal Zotero approval.

#### Scenario: Workflow submit is called

- **WHEN** Host Bridge workflow submit is requested
- **THEN** this write auto-approval mechanism SHALL NOT bypass workflow submit
  approval.

### Requirement: Literature ingest SHALL commit required core effects and classify optional enrichment

Literature ingest SHALL require creation or verified reuse of the typed bibliographic item and, when requested, membership in one explicit valid collection. If a required effect fails, the Broker SHALL restore preexisting state and remove only objects created by that invocation; it SHALL never remove a reused item or preexisting collection membership. PDF and landing attachment work are optional enrichment. A clean optional failure with no residual or uncertainty SHALL preserve core committed or unchanged evidence and report its failed or canceled enrichment attempt. Any residual or uncertain optional effect SHALL be repair_required or unknown and include bounded affected/residual refs.

#### Scenario: Required collection membership fails
- **WHEN** ingest creates an item but cannot establish requested collection membership
- **THEN** it SHALL remove only the invocation-created item and restore prior state
- **AND** it SHALL return attempt evidence rather than a core receipt.

#### Scenario: Optional enrichment leaves residual work
- **WHEN** optional PDF or landing work cannot be fully compensated or verified
- **THEN** output SHALL classify it as repair_required or unknown with residual evidence
- **AND** it SHALL not suppress the enrichment outcome.

## ADDED Requirements

### Requirement: Literature ingest destination SHALL be explicit in preview
Ingest SHALL accept optional libraryId and collectionRef, derive the library from a collection, reject conflicting destinations, and default root requests to the personal library. Preview SHALL expose the resolved library. Root results SHALL report collectionRef null and collectionOutcome not_requested, preserve reused membership, and create no membership. Destination drift SHALL invalidate prepared execution.

#### Scenario: Root ingest omits library
- **WHEN** ingest omits collectionRef and libraryId
- **THEN** preview and execution target the personal library and report no requested membership

#### Scenario: Conflicting destination
- **WHEN** explicit libraryId differs from the requested collection library
- **THEN** the request fails before effects

#### Scenario: Existing root identity
- **WHEN** root ingest reuses an existing matching item
- **THEN** its curated metadata and existing memberships remain intact

### Requirement: Permanent removal SHALL enumerate native descendants
Permanent removal SHALL enumerate regular-item notes and attachments, note embedded attachments, and file-attachment annotations, including trashed descendants. The complete bounded scope SHALL appear in preview and receipt; reject_if_present SHALL reject any child-bearing target. Reader failures and oversized scopes SHALL fail before effects.

#### Scenario: Attachment has annotations
- **WHEN** permanent removal targets a file attachment with trashed annotations
- **THEN** preview includes those annotations and cascade removes them with receipt evidence

#### Scenario: Native reader fails
- **WHEN** a supported child reader fails
- **THEN** removal fails without substituting an empty child list

### Requirement: Effective global approval SHALL distinguish automatic approval
Runtime manifests and write receipts SHALL use auto-approved when the global automatic approval preference is enabled. Reads and canonical dry runs SHALL use none. Only zotero-ui-required SHALL prompt; trusted per-run grant boundaries and workflow-submit isolation SHALL remain intact.

#### Scenario: Global automatic approval enabled
- **WHEN** a canonical write executes over HTTP or MCP with global automatic approval enabled
- **THEN** manifest and receipt report auto-approved and no approval callback prompts

#### Scenario: Read or preview
- **WHEN** a read or canonical dry run executes under global automatic approval
- **THEN** its receipt reports none
