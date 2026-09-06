# workflow-host-api-v12 Specification

## Purpose

Defines the complete trusted in-process Workflow Host API v12 interface, its exact identity and variants, the owner projections behind every member, and the hard removal of legacy host access paths.

## Requirements

### Requirement: Workflow Host SHALL expose one exact v12 surface

The active Workflow Host interface SHALL preserve the existing v12 surface, including navigation and Managed Note members, and add mutations.getOperation. The manifest SHALL measure 23 top-level keys, twenty-one nested modules, and 89 callable members. Synthesis grouping keys SHALL not count as callable members. No legacy mutation alias, public handler member, public prepared token, or public expectedRevision member is permitted.

#### Scenario: Interactive projection is inspected
- **WHEN** recursive conformance inspects every top-level and nested key
- **THEN** the projection has exactly the declared 23/21/89 identity and every callable position is a function.

#### Scenario: Undeclared member is exposed
- **WHEN** composition, Broker growth, or a spread adds a top-level or nested member
- **THEN** contract conformance fails before the build can publish the projection.

### Requirement: Contract variants SHALL differ only in execution behavior
Interactive and non-interactive adapters SHALL expose the same exact v12 surface. UI-dependent members in the non-interactive adapter SHALL fail with `interaction_required`; runtime dependency failure SHALL use the stable error taxonomy rather than removing a member or publishing availability flags.

#### Scenario: Non-interactive picker is called
- **WHEN** a non-interactive workflow invokes `file.pickFile`
- **THEN** the member exists and fails with `interaction_required` naming `file.pickFile`

#### Scenario: Synthesis runtime is unavailable
- **WHEN** the Synthesis adapter cannot resolve its runtime
- **THEN** every Synthesis member remains present and the attempted call reports the closed unavailable outcome

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

### Requirement: V12 activation SHALL be a hard compatibility cut
The v12 surface SHALL NOT contain `items`, `prefs`, `parents`, generic `tags`, generic `collections`, `command`, legacy `literature`, optional `resources`, optional `synthesis`, flat Synthesis aliases, `items.getAll`, or v11 operation aliases. No v2-v11 fallback or compatibility adapter SHALL be installed.

#### Scenario: Removed member is called by a migrated package
- **WHEN** governance scans official Workflow packages after activation
- **THEN** no package references a removed member or includes a legacy host-version branch

#### Scenario: Unknown old mutation name is submitted
- **WHEN** a caller submits a removed handler-shaped operation name
- **THEN** the v12 owner returns `unsupported_operation` rather than mapping it to a compatibility alias

### Requirement: Workflow Host SHALL be a closed composition root
Host composition SHALL project named owner members through explicit readonly object literals and deny adapters. It MUST NOT use spread, proxy, dynamic capability catalogs, whole-domain aliases, or runtime discovery to define public identity. Domain implementation, validation, adapter selection, repository state, authorization, and transport remain with their named owners.

#### Scenario: Owner implementation is replaced
- **WHEN** an internal owner uses a different private implementation with the same interface
- **THEN** Workflow Host identity and callers remain unchanged

### Requirement: Workflow-visible native escape hatches SHALL be absent
Workflow runtime and hook scope SHALL not expose `runtime.zotero`, `runtime.handlers`, host-capable `runtime.helpers`, hook-visible `IOUtils`, direct `navigator.clipboard`, raw Zotero objects, Components, Node filesystem modules, internal Broker imports, or runtime adapters.

#### Scenario: Official workflow is statically scanned
- **WHEN** the consumer governance check scans built-in package source
- **THEN** the unauthorized host-access count is zero

### Requirement: Public identity SHALL have one code-native manifest
One readonly code-native manifest SHALL be the runtime identity used for version, recursive conformance, package guard verification, and diagnostics. Types and implementation SHALL mutually check that manifest. Documentation and OpenSpec SHALL describe it but MUST NOT become runtime discovery sources.

#### Scenario: Second allowlist is added
- **WHEN** a separate top-level or nested member allowlist disagrees with the canonical manifest
- **THEN** governance fails and the duplicate cannot become production identity

### Requirement: Host Bridge and MCP SHALL remain independent projections
V12 activation SHALL not automatically expose new Workflow Host members through Host Bridge or MCP. Only the separately approved full-library snapshot projection may change those surfaces as part of its own governed change.

#### Scenario: Workflow-only member is activated
- **WHEN** v12 adds a trusted in-process member not approved for remote exposure
- **THEN** Host Bridge/MCP contracts and permission policy remain unchanged

### Requirement: Workflow hook runs SHALL wire execution control into scoped host APIs
Each workflow hook run SHALL create one runtime-owned host-independent `CancellationSignal`, link (never replace) any upstream caller signal, and compose a scoped Workflow Host whose members fall back to that signal as their default `WorkflowCallControl` when the caller omits control. An explicit caller control, including an empty object, SHALL be respected over the default. The runtime-owned signal SHALL be used only for Workflow Host cooperative cancellation; it SHALL not promise `reason`, `onabort`, `throwIfAborted()`, or `dispatchEvent()`, and SHALL not be assumed to be a native `fetch` signal. The scoped host SHALL bind workflow input materialization to the current workflow/run identity. File, archive, and metadata members SHALL check the effective control signal and MUST NOT publish late success results after cancellation.

#### Scenario: Caller omits control
- **WHEN** a workflow invokes a file, archive, or metadata member without a control argument
- **THEN** the member executes under the hook run's execution signal and cancellation of the run cancels the call

#### Scenario: Caller passes explicit control
- **WHEN** a workflow invokes the same member with its own control object
- **THEN** the explicit control governs the call and the run default is not substituted

#### Scenario: Zotero module scope lacks a native controller
- **GIVEN** the Zotero plugin module scope has no global `AbortController`
- **WHEN** a workflow executes `preflight`, `buildRequest`, and `applyResult`
- **THEN** each hook executes with its runtime-owned `CancellationSignal`
- **AND** an upstream caller signal, when supplied, remains linked to that signal
- **AND** hook completion aborts the runtime-owned signal without requiring a global constructor

### Requirement: File, archive, and input materialization members SHALL use the aligned v12 contract
File picker members SHALL accept the bounded `initialDirectory`/`filters` request DTO; `file.makeDirectory` SHALL support explicit recursive creation. Archive members SHALL accept `{ entries }` request shapes whose entry content is a closed discriminated union, report per-entry `sizeBytes`, detect duplicate entry paths under a single case-folded comparison, and verify written output against the measured plan before returning success. `archive.withExtractedZip` SHALL use the (input, control, callback) signature, scope extracted access to the callback lifetime, and fail closed on cancellation. File and archive failures SHALL use the stable Workflow Host error taxonomy rather than raw runtime exceptions.

#### Scenario: Duplicate archive entries differ only by case
- **WHEN** a write request contains two entry paths that fold to the same comparison key
- **THEN** the request fails with a stable duplicate-value error before any archive is written

#### Scenario: Written archive disagrees with the measured plan
- **WHEN** post-write verification finds the produced files differ from the measured entries or byte counts
- **THEN** the write fails instead of returning a success measurement

#### Scenario: Extraction callback returns after cancellation
- **WHEN** the control signal aborts while an extraction callback is running
- **THEN** `withExtractedZip` fails with a stable canceled error and does not publish the callback result

### Requirement: Synthesis facade failures SHALL use the Workflow Host error contract
Every Synthesis member of the Workflow Host surface SHALL normalize failures through the shared Workflow Host error contract before they reach workflow callers. Synthesis sidecar conflict tokens SHALL map to stable conflict reasons (for example `tag_audit_operation_in_progress` maps to `operation_in_progress`), unavailable or timeout conditions SHALL map to the stable unavailable outcome, and unrecognized failures SHALL map to a stable execution failure. Sidecar-internal codes, reasons, and storage details MUST NOT appear in error details exposed to workflows.

#### Scenario: Sidecar reports a tag-audit conflict
- **WHEN** the sidecar rejects a call with a known tag-audit conflict token
- **THEN** the workflow receives a stable `conflict` error whose reason is the mapped taxonomy value, with no sidecar reason or code in details

#### Scenario: Sidecar fails with an unrecognized error
- **WHEN** the sidecar failure matches no known mapping
- **THEN** the workflow receives a stable `execution_failed` error with adapter-phase recovery semantics

### Requirement: V12 owner DTOs SHALL match the frozen architecture shapes
Owner-level request and result DTOs SHALL carry the fields frozen by the architecture record: related-item mutation results SHALL report a closed outcome enum and the post-write source revision, and SHALL reject self-relation, cross-library, and inactive endpoints at validation; stable issue DTOs SHALL be a closed five-variant union that distinguishes attachment file missing, unreadable, and permission-denied conditions; collection mutations SHALL validate placement against cycles and cross-library parents, normalize membership deltas through one shared validation path, bound removal preview pagination, and read collection versions fail-closed; library snapshot items SHALL carry structured creators and identifier fields; `editor.openSession` SHALL honor an explicit detached request by bypassing the caller session queue instead of silently dropping the flag.

#### Scenario: Related-item mutation reports verified outcome
- **WHEN** `item.addRelated` or `item.removeRelated` completes
- **THEN** the result carries the added/removed/already-present/already-absent outcome and the confirmed source revision from the post-write read

#### Scenario: Detached editor session is requested
- **WHEN** a caller opens an editor session with `detached: true`
- **THEN** the session opens without entering the caller-scoped queue and the flag is not silently ignored

#### Scenario: Collection placement would create a cycle
- **WHEN** a collection create or update places the collection under itself or its descendant
- **THEN** validation fails before any write with a stable invalid-request error

### Requirement: metadata.translateIdentifier SHALL return a closed three-outcome lookup
`metadata.translateIdentifier` SHALL accept a closed request of exactly `type` (one of `DOI`, `ISBN`, `arXiv`, `PMID`) and a non-empty `value`, and SHALL reject the legacy `normalized` alias, an open `type` string, optional identifier input, multiple identifiers, or any caller-controlled resource knob as `invalid_request`. The Host SHALL normalize the request value per identifier type (validating ISBN format and checksum), examine every translator candidate within the fixed hard budgets, and select candidates by exact match on the corresponding identifier field rather than accepting the first translator result. A completed lookup SHALL return exactly one of three normal outcomes — `matched` with one canonical portable regular-item DTO, `ambiguous` with a bounded list of only exact-match candidates, or `not_found` with a closed reason of `no_translator`, `no_candidate`, or `identifier_mismatch` — and every branch SHALL carry the same required evidence of normalized identifier, examined candidate count, exact-match count, and bounded translator id/label pairs. Input over 2,048 characters SHALL fail as `invalid_request`; translator count over 32, examined candidates over 64, returned ambiguous candidates over 64, translator id over 128 characters, translator label over 256 characters, or serialized result over 4 MiB SHALL fail as `resource_limited` with controlled `resource/limit/observed` details and no truncated payload. Translator runtime unavailability SHALL fail as `unavailable`, translator execution failure SHALL fail as `execution_failed`, and neither SHALL be downgraded to a `not_found` result. Item creators SHALL be returned complete up to the shared canonical creator budget of 100 per item, with overflow failing as `resource_limited` rather than silently truncating the creator list.

#### Scenario: First candidate does not match the identifier
- **WHEN** a translator returns multiple candidates and only a later candidate matches the requested identifier exactly
- **THEN** the result is `matched` with that exact candidate and the evidence reports the full examined candidate count and the exact-match count

#### Scenario: Multiple candidates match the identifier
- **WHEN** two translator candidates carry the same requested identifier
- **THEN** the result is `ambiguous` with both candidates and no preferred candidate is silently selected

#### Scenario: No candidate matches the identifier
- **WHEN** translator candidates exist but none carries the requested identifier
- **THEN** the result is `not_found` with reason `identifier_mismatch` and the same required evidence as a `matched` result

#### Scenario: Legacy alias or open type is submitted
- **WHEN** a caller submits `normalized` instead of `value`, a `type` outside the closed four-value union, or a limit/diagnostics knob
- **THEN** the call fails as `invalid_request` before any translator is invoked

#### Scenario: Translator throws during lookup
- **WHEN** the translator runtime raises during translation
- **THEN** the call fails with the stable `execution_failed` taxonomy entry and is not reported as `not_found`

#### Scenario: Candidate volume exceeds the hard budget
- **WHEN** the translator returns more candidates than the fixed examination budget
- **THEN** the entire lookup fails as `resource_limited` with controlled details and no partial candidate list is returned

#### Scenario: Creator list exceeds the canonical budget
- **WHEN** a matched item carries more creators than the shared per-item creator budget
- **THEN** the lookup fails as `resource_limited` instead of returning a silently truncated creator list

### Requirement: notes.create SHALL use a placement discriminated union
`notes.create` SHALL accept a request of exactly `operationId`, a `placement` discriminated union, `content`, and optional `initialTags`. The `top_level` placement MAY carry `libraryId` (defaulting to the user library) and `collectionRefs`; the `child` placement MUST carry `parentRef` and SHALL NOT accept a library or collections, deriving the library from the parent. Every referenced collection SHALL exist, be active, and belong to the target library, and every placement, content, and tag violation SHALL fail before any note is committed. `initialTags` SHALL be applied in the same accepted operation as the note creation, so callers never orchestrate a separate tag mutation to tag a new note. `operationId` SHALL be required and a safe retry of the same operation SHALL NOT create a duplicate note. The request SHALL NOT accept a standalone `title`, and success SHALL return only the portable note summary and the Host-issued receipt.

#### Scenario: Top-level note is created into collections
- **WHEN** a caller creates a `top_level` note with valid same-library `collectionRefs` and `initialTags`
- **THEN** one note is created, placed in every listed collection, and tagged, all confirmed by one receipt

#### Scenario: Child placement rejects library overrides
- **WHEN** a `child` placement carries a library id or collection references
- **THEN** the call fails as `invalid_request` before any write

#### Scenario: Invalid collection fails before commit
- **WHEN** a `top_level` placement references a missing, trashed, or foreign-library collection
- **THEN** the call fails before any note is created

#### Scenario: Operation retry is idempotent
- **WHEN** the same caller scope retries a committed `notes.create` with the same operation identity and request
- **THEN** the original receipt and result are returned and no second note exists

#### Scenario: Optional-field bag is rejected
- **WHEN** a caller submits the legacy flat request mixing `parentRef` with library or collection fields, or a standalone `title`
- **THEN** the call fails as `invalid_request` without creating a note

### Requirement: notes.upsertPayload SHALL be idempotent, conflict-safe, and compensated
`notes.upsertPayload` SHALL accept only the logical payload (`payloadType`, kind, schema identity, format, and value) plus `operationId`, `noteRef`, and optional `expectedRevision`, and SHALL reject caller-chosen encoding, storage preference, source, or attachment references. Its success result SHALL be exactly `{note, payload, outcome}` where `outcome` is one of `created`, `replaced`, or `unchanged`. When the stored logical content and schema identity match the request hash exactly, the Host SHALL return `unchanged` without rewriting the note or any attachment. When multiple payloads of the same `payloadType` exist on the note, the Host SHALL fail with `conflict` and details reason `ambiguous_state` rather than silently replacing all of them. If a new payload attachment has been created but the note update fails, the Host SHALL attempt to delete the new attachment, preserve the original failure as the primary error, and report any attachment that could not be removed in `residualRefs`. If the note was updated but old-attachment cleanup cannot be confirmed, the outcome SHALL be `repair_required` or `unknown` rather than a full success. Replaying the same operation identity SHALL return the original result without creating another attachment.

#### Scenario: Identical payload short-circuits
- **WHEN** the note already stores a payload whose logical content and schema identity hash equal the request
- **THEN** the result outcome is `unchanged`, no attachment is rewritten, and the receipt confirms verified state

#### Scenario: Duplicate payload type is a conflict
- **WHEN** the note holds two payloads with the requested `payloadType`
- **THEN** the call fails with `conflict` reason `ambiguous_state` and no payload is modified or deleted

#### Scenario: Note update fails after attachment staging
- **WHEN** the new payload attachment was created but updating the note fails
- **THEN** the Host attempts to delete the new attachment, the attempt report preserves the original failure as primary, and any surviving attachment appears in `residualRefs`

#### Scenario: Old attachment cleanup is unconfirmed
- **WHEN** the note update committed but removal of the superseded attachment cannot be confirmed
- **THEN** the result is `repair_required` or `unknown` with the residual attachment recorded, not a committed success

#### Scenario: Storage knobs are rejected
- **WHEN** a caller submits `encoding`, `source`, `attachmentRef`, or an inline/attachment preference
- **THEN** the call fails as `invalid_request` before any write

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

### Requirement: Workflow readers SHALL preserve canonical page and control semantics
Workflow library members SHALL explicitly project Broker source pages and call controls. Complete consumers SHALL follow continuation to exhaustion, including empty nonterminal payload scans. The projection SHALL NOT accept both complete arrays and pages, rebuild legacy rich objects, or reacquire live selection to compensate for changed reader results.

#### Scenario: A workflow needs an attachment on a later page
- **WHEN** a research bundle or workflow reader searches beyond its first page
- **THEN** it follows canonical continuation and preserves the existing complete task result.

#### Scenario: Scoped workflow is canceled
- **WHEN** cancellation occurs between source pages
- **THEN** no subsequent native page starts and no successful complete result is fabricated.

### Requirement: V12 selection SHALL project the canonical page contract
The explicit v12 context projection SHALL expose getSelectedItems(request?, control?) with the Broker exact selection page contract. The synchronous current-view member SHALL retain canonical library-tree source facts without an embedded selected-item array. These signature changes SHALL NOT add a callable or expose owner internals.

#### Scenario: Scoped selection read is invoked
- **WHEN** a Workflow calls context.getSelectedItems with a page request
- **THEN** the projection forwards the request and effective trusted control and returns the canonical page

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
