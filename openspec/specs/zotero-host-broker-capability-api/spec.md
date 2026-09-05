# zotero-host-broker-capability-api Specification

## Purpose
TBD - created by archiving change add-zotero-host-broker-capability-api. Update Purpose after archive.
## Requirements

### Requirement: JSON-safe broker read API

The system SHALL expose context, library, and metadata capabilities through the canonical Zotero Host Capability Broker. Public broker inputs, successful DTOs, and structured error details SHALL contain only null, booleans, strings, finite numbers, arrays, and plain objects recursively. They SHALL NOT contain undefined properties, non-finite numbers, bigint, symbols, functions, dates, maps, sets, cyclic structures, or Zotero runtime objects.

#### Scenario: Current view DTO

- **WHEN** a caller requests the current view or selected items
- **THEN** the result SHALL describe the current Zotero target, library, selection state, item summaries, and optional collection using strict JSON values
- **AND** collection membership and collection identifiers SHALL be normalized to bounded scalar values.

#### Scenario: Library item DTOs

- **WHEN** a caller lists, searches, or reads Zotero items, notes, payloads, annotations, or attachments
- **THEN** every returned DTO SHALL be constructed from explicitly normalized fields
- **AND** raw Zotero objects SHALL NOT be returned
- **AND** unknown payload values SHALL be rejected rather than silently coerced or dropped.

#### Scenario: Metadata translate identifier DTO

- **WHEN** a caller translates a DOI, ISBN, arXiv identifier, or PMID
- **THEN** successful and diagnostic results SHALL contain strict JSON values
- **AND** all numeric values SHALL be finite
- **AND** translator runtime objects SHALL NOT be returned.

### Requirement: Controlled mutation command API

The canonical broker SHALL expose limited Zotero write operations through mutation preview and execute operations. The broker SHALL validate and perform these operations without owning caller authorization; each exposed adapter SHALL enforce its declared permission policy before execution.

#### Scenario: Preview validates without writing

- **WHEN** a supported mutation request is previewed
- **THEN** the broker SHALL validate references and inputs, return a strict JSON summary, and mark confirmation as required
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Execute delegates to handlers

- **WHEN** an adapter has authorized a supported mutation and invokes execute
- **THEN** the broker SHALL reuse the canonical mutation implementation
- **AND** the result SHALL contain strict JSON changed-object summaries.

#### Scenario: Literature ingest uses canonical operation

- **WHEN** a literature ingest mutation is passed to preview or execute
- **THEN** the canonical operation SHALL be `literature.ingest`
- **AND** successful preview and execute responses SHALL report `operation: "literature.ingest"`.

#### Scenario: Legacy and batch literature ingest inputs are rejected

- **WHEN** a mutation request uses `operation: "paper.ingest"` or passes a `papers` batch payload to `operation: "literature.ingest"`
- **THEN** the broker SHALL reject the mutation with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Unsupported or invalid mutation

- **WHEN** a mutation has an unsupported operation, invalid reference, invalid field, empty payload, or oversized input
- **THEN** the broker SHALL reject it with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.

### Requirement: Workflow projection is explicit and closed

The Workflow Host API SHALL project approved Broker capabilities through named
v12 members and SHALL NOT expose handler objects or raw Broker domains.

#### Scenario: Workflow needs a Broker capability

- **WHEN** current workflow code needs a Zotero read or mutation
- **THEN** it SHALL call the applicable named v12 module
- **AND** removed handler-shaped aliases SHALL be rejected rather than adapted.

#### Scenario: MCP tools use broker boundary

- **WHEN** MCP tools need Zotero read or write capabilities
- **THEN** they SHALL use broker APIs and DTOs
- **AND** they SHALL NOT directly expose `handlers.*` as MCP tools.

### Requirement: Host Bridge write auto-approval is scoped to an ACP run

Host Bridge mutation execution SHALL skip Zotero approval only when the current
ACP run profile scope is trusted for write auto-approval by the ACP run store.

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
- **THEN** the Host Bridge SHALL require the normal Zotero approval.

#### Scenario: Workflow submit is called

- **WHEN** Host Bridge workflow submit is requested
- **THEN** this write auto-approval mechanism SHALL NOT bypass workflow submit
  approval.

### Requirement: Host note payload APIs SHALL expose workflow payloads
Host Bridge note payload APIs MUST return workflow payloads regardless of whether they are stored in v2 embedded payload attachments, legacy v1 embedded attachments, or hidden HTML blocks.

#### Scenario: Payload manifest includes storage diagnostics
- **WHEN** Host Bridge lists note payloads
- **THEN** each payload entry SHALL include source/storage version diagnostics when available
- **AND** embedded payload entries SHALL include attachment key and anchor status when available.

### Requirement: Host Bridge LAN mode requires a fixed port
When LAN access is enabled, Host Bridge MUST use the configured fixed port and MUST NOT silently fall back to a random port.

#### Scenario: LAN enabled
- **WHEN** LAN access is enabled
- **THEN** fixed port mode is enabled
- **AND** status reports `bindMode=lan` and `portMode=pinned`

#### Scenario: LAN fixed port unavailable
- **WHEN** the configured fixed port cannot be bound in LAN mode
- **THEN** Host Bridge reports an error
- **AND** it does not disable fixed port mode or select a random port

### Requirement: Host Bridge accepts master token authentication
Host Bridge MUST accept either the current local token or the configured master token as bearer auth.

#### Scenario: Master token auth
- **WHEN** a request uses the current master token
- **THEN** protected endpoints authorize successfully
- **AND** manifests/status only expose masked master token metadata

### Requirement: File download manifest declares remote support
The manifest MUST describe file downloads as bearer-authenticated and remote-client compatible.

#### Scenario: Manifest requested
- **WHEN** the manifest is returned
- **THEN** `fileDownloads.supportsRemoteClients` is true
- **AND** `fileDownloads.urlTemplate` is `{endpoint}/files/{fileId}`

### Requirement: Host Bridge capability calls SHALL preserve JSON input text
Host Bridge capability calls SHALL parse HTTP JSON request bodies from raw bytes and decode them as UTF-8.

#### Scenario: Non-ASCII capability input survives request parsing
- **WHEN** a Host Bridge caller posts a JSON body containing Chinese text, full-width punctuation, or emoji
- **THEN** the decoded capability input SHALL preserve those characters exactly.

#### Scenario: Malformed UTF-8 request body is rejected
- **WHEN** a Host Bridge request body is not valid UTF-8
- **THEN** the request SHALL fail with a structured bad-request error
- **AND** the bridge SHALL NOT pass mojibake text to a capability handler.

### Requirement: Literature ingest may attach landing URL when PDF is missing

`literature.ingest` SHALL support an optional `paper.attachLandingUrlOnMissingPdf`
boolean. The default SHALL be false.

#### Scenario: Missing PDF creates landing URL attachment when requested

- **WHEN** `literature.ingest` successfully creates or reuses a literature item
- **AND** `paper.attachLandingUrlOnMissingPdf` is true
- **AND** the resulting item has no PDF attachment after PDF import handling
- **AND** `paper.landingUrl` is a non-empty HTTP(S) URL
- **THEN** the mutation SHALL create or reuse one linked URL child attachment
  for that landing URL
- **AND** the ingest result SHALL include `landingAttachmentStatus`.

#### Scenario: Existing PDF suppresses landing URL attachment

- **WHEN** `literature.ingest` successfully creates or reuses a literature item
- **AND** the resulting item has a PDF attachment
- **THEN** the mutation SHALL NOT create a landing URL attachment for missing-PDF recovery.

#### Scenario: Landing URL attachment failure is non-fatal

- **WHEN** landing URL attachment creation fails
- **THEN** the literature item ingest SHALL remain successful
- **AND** the result SHALL include `landingAttachmentStatus: "failed"` and a
  structured `landingAttachmentError`.

### Requirement: Literature ingest SHALL accept a typed bibliographic item payload
The canonical `literature.ingest` mutation SHALL accept an explicit Zotero item type, item-type-compatible fields, structured creators, normalized identifiers, and source URLs, and SHALL reject the legacy flat paper shape. It SHALL store a normalized DOI in the native Zotero DOI field whenever that field is valid for the selected item type, using `Extra` only when no native DOI field exists.

#### Scenario: Non-journal type preserves semantic fields
- **WHEN** a request ingests a thesis, book, book section, conference paper, report, or generic document
- **THEN** the Host creates that item type and maps only fields valid for that type.

#### Scenario: Unknown item type does not become journal article
- **WHEN** a traceable record has no confidently resolved bibliographic type
- **THEN** the caller uses `document` rather than the Host guessing `journalArticle`.

#### Scenario: Structured creator names are not heuristically split
- **WHEN** a creator is supplied as a single-field Chinese personal name or organization name
- **THEN** the Host stores the single-field name without splitting it on whitespace.

#### Scenario: Invalid field role is rejected
- **WHEN** a typed payload assigns a field that is invalid for its item type
- **THEN** the mutation returns a structured validation failure instead of silently redirecting the value to another field.

#### Scenario: Identifier-only DOI uses the native field
- **WHEN** a typed payload supplies `paper.identifiers.doi` for an item type whose Zotero schema supports DOI and omits `paper.fields.DOI`
- **THEN** the Host SHALL write the normalized identifier to the native DOI field
- **AND** it SHALL NOT append that DOI to `Extra`.

#### Scenario: Unsupported item type retains DOI in Extra
- **WHEN** a typed payload supplies a DOI for an item type without a native DOI field
- **THEN** the Host SHALL preserve one normalized `DOI: ...` line in `Extra`.

#### Scenario: DOI representations conflict
- **WHEN** normalized `paper.identifiers.doi` and `paper.fields.DOI` values are both present and differ
- **THEN** the mutation SHALL return a structured validation failure without creating or updating an item.

### Requirement: Workflow Host API executes ordered text export translators

The staged bibliography API SHALL list stable Host-issued format refs with current availability and SHALL render portable regular-item refs using the caller's ordered, non-empty format preference. The Host MUST select only the first available declared format, report the actual format and derived fallback status, validate strict-JSON options against that format's schema, preserve input item order, and return complete bounded content without exposing translator objects or native identities. The active v11 text-export adapter MAY delegate to the same renderer until atomic activation.

#### Scenario: Preferred translator succeeds
- **WHEN** bibliography render receives valid portable regular-item refs and the first requested format is available
- **THEN** the Host returns complete content, the actual stable format DTO, `fallbackUsed: false`, and no fallback issue
- **AND** item order is preserved

#### Scenario: Host advances to fallback translator
- **WHEN** an earlier requested format is unavailable and a later requested format is available
- **THEN** the Host uses the later format, reports `fallbackUsed: true`, and returns the closed fallback issue
- **AND** it does not insert an undeclared fallback

#### Scenario: Every candidate fails
- **WHEN** none of the caller-declared formats is currently available
- **THEN** rendering fails with stable `unavailable` data for `bibliography_format`
- **AND** it does not return partial content or native translator diagnostics

#### Scenario: Render request is not safely bounded
- **WHEN** a request contains duplicates, a non-regular or missing item, more than 10,000 refs, invalid format options, or output larger than 64 MiB
- **THEN** the entire render fails with the applicable stable validation or resource error
- **AND** no partial bibliography is returned

#### Scenario: Workflow remains decoupled from plugin-private interfaces
- **WHEN** a workflow prefers a format supplied by an optional extension
- **THEN** it uses the stable format ref and availability contract
- **AND** it does not require extension globals, add-on-manager lookup, localhost RPC, translator UUIDs, or numeric native constants

### Requirement: Broker references are portable

The canonical broker SHALL accept only portable JSON item and collection references. Workflow compatibility code MAY accept raw Zotero objects only when it normalizes them before calling the broker.

#### Scenario: Workflow passes a raw item

- **WHEN** a v11 workflow host method receives a resolvable raw Zotero item
- **THEN** the workflow adapter SHALL derive a portable reference before invoking the broker
- **AND** downstream Host Bridge and MCP adapters SHALL never receive the raw item.

### Requirement: Navigation is separate from context queries

The broker SHALL expose Zotero UI selection and focus effects through a navigation capability family separate from context queries.

#### Scenario: Caller reads context

- **WHEN** a caller requests current view or selected items
- **THEN** no navigation or focus effect SHALL occur.

#### Scenario: Adapter invokes navigation

- **WHEN** an authorized and exposed adapter invokes a navigation operation
- **THEN** the broker SHALL return a JSON-safe navigation result
- **AND** interaction and exposure policy SHALL remain owned by the adapter.

### Requirement: Broker failures use stable codes and safe details

Broker failures that cross an adapter seam SHALL provide a stable canonical error code, retryability, and optional strict JSON details without retaining raw references or host objects.

#### Scenario: Referenced item is missing

- **WHEN** a broker operation cannot resolve an item reference
- **THEN** the failure SHALL use the canonical item-not-found code
- **AND** adapters MAY map that code to their existing external protocol code
- **AND** public details SHALL NOT contain the original raw host object.

### Requirement: Broker adapters SHALL preserve stable safe failure data

Every Broker adapter SHALL preserve the shared error code, retryability, and code-specific details without reconstructing meaning from prose. An adapter MUST reject results or test doubles that contain undeclared codes, open details, lossy JSON values, or unconfigured capability members.

#### Scenario: Fail-closed test adapter omits a capability

- **WHEN** a test adapter does not explicitly configure a required Broker capability
- **THEN** the call fails as unavailable instead of falling through to the real Zotero runtime

#### Scenario: Transport projects a Broker failure

- **WHEN** Host Bridge or another adapter maps a canonical Broker failure to its transport envelope
- **THEN** the transport preserves the canonical semantics without making transport codes the Broker source of truth

### Requirement: Broker DTO validation SHALL be bounded and deterministic

Strict-JSON validation SHALL reject non-finite numbers, excessive nesting, excessive collection size, and unsupported values using deterministic bounded diagnostics. Validation MUST NOT use stringify/parse as a sanitizer.

#### Scenario: Lossy value is submitted

- **WHEN** a request contains `undefined`, a function, a native object, or a non-finite number
- **THEN** validation fails before Zotero state is read or mutated

### Requirement: Library item listing SHALL use one canonical page contract
`library.listItems` SHALL resolve an omitted library to the user library, normalize one collection/tag/item-type/query criterion, apply stable identity ordering, and return items, resolved criteria, returned and scanned counts, `hasMore`, and an opaque continuation cursor. Query matching SHALL not create a separate Workflow search member or relevance order.

#### Scenario: Query page has continuation
- **WHEN** more matching items remain after the requested bounded page
- **THEN** `hasMore` is true and `nextCursor` is non-null and bound to the resolved criteria and ordering

#### Scenario: Cursor criteria changes
- **WHEN** a cursor is reused with a different library, filter, scope, or ordering
- **THEN** the call fails with a stable invalid-request or conflict error and returns no page

### Requirement: Live item traversal SHALL be bounded and callback-scoped
`library.traverseItems` SHALL accept only the `top-level-regular` scope in v12, process batches serially, enforce centralized defaults and hard maxima, and return completed, canceled, or resource-limited coverage. Each batch item SHALL be a traversal-only regular-item summary carrying the Broker-owned canonical tag digest from the same complete Host read as its revision and tags; the delivered revision SHALL be reused from that same read and MUST NOT be re-read before delivery. Each item's canonical tag set SHALL be deduplicated and sorted in code-unit order, and that ordering SHALL be identical across the plugin and the Synthesis sidecar runtimes. The terminal coverage digest SHALL be computed by buffering every delivered (ref, revision, tagDigest) tuple, sorting the buffered tuples by (libraryId, key) in code-unit order at completion, and hashing the sorted tuple stream, so the digest is independent of page delivery order and reproducible across processes. Ordinary item-list and selection-summary DTOs SHALL remain unchanged. Previously completed callbacks SHALL not be represented as rolled back after a later stop.

#### Scenario: Callback receives audit evidence
- **WHEN** a traversal batch is delivered to a trusted callback
- **THEN** every item carries its canonical tag digest and the terminal coverage digest is derived from those exact delivered item references, revisions, and tag digests

#### Scenario: Items are delivered out of identity order across pages
- **WHEN** a multi-item traversal delivers batches whose item order differs from (libraryId, key) code-unit order
- **THEN** the terminal coverage digest equals the digest computed from the same tuples sorted by (libraryId, key), matching the digest the Synthesis sidecar computes for the same delivered set

#### Scenario: Callback rejects
- **WHEN** the batch callback throws or rejects
- **THEN** traversal fails and does not claim that caller side effects from earlier batches were rolled back

#### Scenario: Empty library is traversed
- **WHEN** no item matches the resolved criteria
- **THEN** traversal returns completed with canonical empty coverage evidence

### Requirement: Collection and annotation reads SHALL be complete within their bounds
Collection and annotation reads SHALL return source-bounded pages in stable order, with a default limit of 25 and a maximum of 100. Collection rows SHALL expose portable parent identity, revision, active state, and display path. Annotation pages SHALL preserve native annotation order with a stable identity tie-breaker. Hydration or serialization failure of any target SHALL fail the entire page rather than return an incomplete successful list.

#### Scenario: Caller builds a collection tree
- **WHEN** the caller follows all collection page cursors
- **THEN** parent references provide enough information to build a tree without a separate tree member or full-library hydration.

#### Scenario: Annotation page continues
- **WHEN** more annotations remain than fit the requested page
- **THEN** the result contains a bounded page and opaque continuation, with no full annotation-array fallback.

### Requirement: Navigation SHALL return normalized target evidence
Navigation calls SHALL accept portable refs, reject kind mismatches and duplicate selection refs, preserve selection order, and return only the normalized opened target and timestamp. Non-interactive projection behavior remains governed by the shared error contract.

#### Scenario: Selection is opened
- **WHEN** an interactive caller supplies a bounded ordered set of unique item references
- **THEN** the Host opens that selection and returns the same normalized reference order

### Requirement: Broker snapshot sessions SHALL bind immutable read basis
The Broker SHALL bind each snapshot identity and cursor to the resolved library, scope, schema, stable ordering, captured item set, and process identity. A changed basis, foreign cursor, expired session, or hard-cap violation SHALL fail without returning completed evidence.

#### Scenario: Cursor belongs to another snapshot
- **WHEN** a cursor from one snapshot is submitted with another snapshot identity
- **THEN** the Broker rejects the request before returning item data

### Requirement: Broker SHALL issue completion evidence only after full delivery
The Broker SHALL issue completion evidence only after every item in the captured set has been delivered through the selected projection and the terminal cursor is exhausted. Evidence SHALL bind the snapshot basis and delivered revisions.

#### Scenario: Callback cancels after receiving a batch
- **WHEN** a trusted Workflow callback cancels before full delivery
- **THEN** the terminal result is incomplete and includes no promotion-capable completion evidence

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

### Requirement: Prepared-image contract SHALL be bounded and run-scoped
Image preparation SHALL validate encoded and decoded source size, MIME declaration and signature, dimensions, options, and output before unbounded decode or registry admission. One input MUST NOT exceed 32 MiB decoded, `maxLongEdge` MUST NOT exceed 8,192 pixels, `hardMaxBytes` MUST NOT exceed 8 MiB, `targetBytes` MUST NOT exceed `hardMaxBytes`, and one workflow run MUST NOT retain more than 64 MiB of live prepared images.

#### Scenario: Prepared image is reused within one run
- **WHEN** the same valid prepared-image ref is bound to multiple note operations in its owning run
- **THEN** each operation may resolve the same immutable prepared content
- **AND** operation replay does not create duplicate Zotero attachments

#### Scenario: Workflow run terminates
- **WHEN** a workflow run reaches any terminal outcome
- **THEN** all prepared-image resources owned by that run are cleaned automatically
- **AND** callers are not required to release refs manually

#### Scenario: Image request exceeds a bound
- **WHEN** source size, dimensions, options, output bytes, or live per-run bytes exceed a declared hard limit
- **THEN** preparation fails with `resource_limited` before admitting the result
- **AND** no partial registry entry remains

### Requirement: Tag reads on write and snapshot paths SHALL be fail-closed
Any Host operation whose result commits, verifies, or evidences item tag state SHALL obtain tags through the canonical bounded tag read. A failed, non-array, truncated, or over-limit tag read SHALL fail the operation with a stable error instead of silently substituting an empty or partial tag set. This applies to `item.updateTags`, `statusTags.transition`, and library sync snapshot item serialization. A snapshot whose tag read fails SHALL NOT issue completion evidence.

#### Scenario: Tag read fails during a tag mutation
- **WHEN** the canonical tag read throws or returns invalid data while `item.updateTags` or `statusTags.transition` verifies pre- or post-write tag state
- **THEN** the mutation fails with a stable read-phase error and does not commit a tag state derived from partial data

#### Scenario: Tag read fails during snapshot serialization
- **WHEN** an item's tags cannot be read completely while a library sync snapshot item is serialized
- **THEN** the snapshot fails and no completion evidence covering that item is issued

### Requirement: Mutation admission SHALL reject unsupported operations and retry SHALL form successor attempts
`mutations.execute` SHALL reject any operation name outside the closed canonical operation set at admission with a stable `unsupported_operation` error before any reservation or write. When a previously recorded terminal failure carries the `retry_same_operation` recovery contract, a retried call with the same operation identity and semantic input SHALL NOT replay the stale failure snapshot; the authority SHALL discard the failed record and execute a fresh successor attempt under the same operation identity. Idempotency conflicts for diverging semantic input and in-flight deduplication for identical running operations SHALL remain unchanged.

#### Scenario: Unknown operation is submitted
- **WHEN** a caller submits an operation name not in the canonical eleven-operation union
- **THEN** admission fails with `unsupported_operation` naming the submitted operation and no mutation record or Host write is created

#### Scenario: Retriable failure is retried
- **WHEN** an operation whose recorded terminal failure has recovery `retry_same_operation` is submitted again with identical semantic input
- **THEN** the stale failure is discarded and a new attempt executes, producing a fresh terminal result rather than the cached failure

### Requirement: Attachment mutations SHALL require ordinary-role targets
`attachments.updateMetadata`, `attachments.replaceFile`, `attachments.move`, and `attachments.remove` SHALL resolve the target attachment's role before writing and SHALL reject targets whose role is `note_image` or `note_payload` with a stable `invalid_ref` error carrying reason `wrong_kind`. Attachment creation role assignment and note-payload write paths SHALL remain governed by their own named interfaces.

#### Scenario: Managed note-image attachment is targeted
- **WHEN** a caller submits an attachment mutation against an attachment whose role is `note_image` or `note_payload`
- **THEN** the mutation fails with `invalid_ref`/`wrong_kind` before any write, and the managed attachment is unchanged

### Requirement: Tag audit runs SHALL reconcile stale activity and promote idempotently
Tag audit run begin SHALL carry the host's currently active run ids and SHALL be serialized per host so concurrent begins observe a consistent active set; the Synthesis runtime SHALL abandon runs of the same host that are not in that active set before admitting the new run. Promoting an audit run that was already promoted for the same source run SHALL return the persisted snapshot rather than a freshly computed unpublished revision. `acknowledgeRegulation` SHALL fail with a stable `canceled` error when the caller signal is already aborted, and MUST NOT fabricate a stale outcome. A successful audit publish or regulation acknowledgement SHALL trigger tag-ledger invalidation notification for the affected surfaces.

#### Scenario: Begin follows a crashed run
- **WHEN** a new audit run begins while the repository holds a non-terminal run for the same host that is not in the caller's active set
- **THEN** the stale run is abandoned before the new run is admitted

#### Scenario: Promote is retried after success
- **WHEN** promotion is requested again for an audit run whose promotion already succeeded
- **THEN** the result is the persisted snapshot for that source run, not a new unpublished revision

#### Scenario: Acknowledgement is canceled before execution
- **WHEN** `acknowledgeRegulation` is invoked with an already-aborted control signal
- **THEN** the call fails with a stable `canceled` error and issues no acknowledgement

### Requirement: Metadata identifier translation SHALL be a bounded exact-match broker lookup
The broker SHALL own identifier metadata translation semantics: late binding of the Zotero search-translation capability, per-type identifier normalization from a closed normalization table, ISBN format and checksum validation, bounded examination of every translator candidate, exact-match candidate selection on the corresponding identifier field, canonical portable-item serialization, and stable failure mapping. The lookup SHALL be read-only — it SHALL NOT create items, save attachments, or write to the library — and SHALL complete in one bounded call with no caller-controlled pagination, limit, or diagnostics knobs. The broker SHALL NOT guess identifier types, extract identifiers from free text, accept multiple identifiers per request, treat the first translator candidate as a match, or silently truncate translator, candidate, creator, or evidence collections; budget overflow SHALL fail as `resource_limited` and translator runtime failure SHALL surface through the stable taxonomy rather than as a negative lookup result.

#### Scenario: Broker normalizes a provider URL
- **WHEN** a caller submits a bare identifier, a standard prefixed form, or a standard provider URL for a declared identifier type
- **THEN** the broker normalizes it per the closed per-type table and reports the normalized identifier in the result evidence

#### Scenario: Free-text extraction is refused
- **WHEN** a caller submits a citation string or paragraph expecting identifier extraction
- **THEN** the broker fails as `invalid_request` rather than guessing an identifier

#### Scenario: Translator list is empty
- **WHEN** no translator participates in the lookup
- **THEN** the broker reports the closed no-translator negative outcome and does not misreport it as runtime unavailability

#### Scenario: Invalid ISBN is rejected before translation
- **WHEN** an ISBN value fails format or checksum validation
- **THEN** the broker fails as `invalid_request` without invoking any translator

### Requirement: Broker note creation SHALL validate placement atomically
The broker SHALL own note creation semantics in which placement is exactly one of a top-level placement (optional library defaulting to the user library, optional same-library active collections) or a child placement (a valid parent item, library derived from the parent). Placement, content bound, collection validity, and initial tag validation SHALL all complete before any note is committed, and initial tags SHALL be committed within the same operation boundary as the note itself rather than as a separately orchestrated mutation. The broker SHALL derive the note title from note content and SHALL NOT accept a standalone title field.

#### Scenario: Cross-library collection is rejected before commit
- **WHEN** a top-level placement references a collection outside the resolved target library
- **THEN** the broker fails validation and no note exists afterwards

#### Scenario: Child note inherits the parent library
- **WHEN** a child placement names a valid parent item
- **THEN** the note is created in the parent's library with no independent library or collection input

#### Scenario: Initial tags commit with the note
- **WHEN** a creation request carries initial tags
- **THEN** a single accepted operation produces a tagged note and there is no observable committed note that lacks the requested tags

### Requirement: Broker payload upsert SHALL be idempotent and compensated
The broker SHALL own payload storage policy for note payload upsert: logical value validation against the decoded-size hard limit, canonical payload hashing, the inline-versus-attachment and encoding decisions, staging of a new attachment, note anchor and content update, superseded-attachment cleanup, revision advancement for the note and affected items, and a unified receipt covering the note plus old and new attachments. Identical logical content and schema identity SHALL short-circuit to a verified unchanged result without rewriting note or attachment state, and duplicate payloads of one payload type SHALL fail as a conflict with ambiguous-state details instead of being silently replaced. When a new attachment exists but the note update fails, the broker SHALL attempt compensating deletion of the new attachment, keep the original failure as the primary error, and record any surviving attachment as a residual reference; when superseded-attachment cleanup cannot be confirmed after a committed note update, the broker SHALL report a repair-required or unknown outcome rather than confirmed success.

#### Scenario: Hash-identical upsert does no work
- **WHEN** an upsert request's canonical hash equals the stored payload's logical content and schema identity
- **THEN** the broker returns the unchanged outcome, issues no attachment write, and the receipt records only verified state

#### Scenario: Compensation removes the orphaned attachment
- **WHEN** note update fails after the new payload attachment was created and the compensating delete succeeds
- **THEN** the attempt report names the original failure as primary and lists no residual attachment

#### Scenario: Compensation failure is visible
- **WHEN** note update fails and the new payload attachment cannot be deleted
- **THEN** the attempt report preserves the original failure as primary and records the orphaned attachment in residual references

### Requirement: Broker attachment file replacement SHALL preserve original content on failure
The broker SHALL own file replacement semantics for file-backed attachments: source-kind versus link-mode matching with no implicit conversion, pre-commit validation of the complete stored file set, managed staging, atomic switch of managed content, post-commit cleanup with an explicit repair-required or unknown outcome when cleanup is unconfirmed, and linked-file relocation that validates and canonicalizes the new path while never copying, modifying, or deleting external files. All filesystem access SHALL go through the shared runtime persistence adapter resolved per call. Content-identical replacement (same hash and complete companion set, or same canonical linked path) SHALL be confirmed as unchanged, and filename and MIME identity SHALL be re-derived from the actual replacement source. Any replacement failure SHALL leave the target attachment's original file intact and SHALL preserve the original failure as the primary error, with replay of the same operation identity returning the original receipt rather than repeating staging, swap, or cleanup.

#### Scenario: Failed switch keeps the original file
- **WHEN** the atomic switch fails after managed staging completed
- **THEN** the attachment still resolves to its original file content and the attempt report carries the original failure as primary

#### Scenario: Linked relocation validates the new path
- **WHEN** the new linked path does not exist or is not a regular readable file
- **THEN** the broker fails before updating the Zotero link and the attachment still points at the old path

#### Scenario: Replay returns the original receipt
- **WHEN** the same caller scope replays a committed replacement with the same operation identity
- **THEN** the broker returns the original receipt and result snapshot without repeating staging, swap, or cleanup

### Requirement: Ordinary read pages SHALL be sourced and owned by the Broker
Items, collections, notes, note payloads, attachments, annotations and Saved Searches SHALL be read through bounded source pages. Ordinary list defaults and maxima SHALL be 25 and 100. Each domain SHALL return its named array and explicit continuation, returned count and effective limit, retaining existing domain fields. Cursors SHALL bind domain, normalized criteria, source and ordering position, with content basis where required. Ordinary live lists SHALL NOT imply snapshot consistency or acquire a time-to-live. Numeric/offset cursors, malformed or unsupported cursors, query mismatch and changed content basis SHALL produce structured failures without silently restarting.

#### Scenario: Only a current page is hydrated
- **WHEN** a client requests one page from a large source
- **THEN** only that page's targets are hydrated and serialized; count queries do not hydrate non-page targets.

#### Scenario: Page target fails
- **WHEN** any target cannot be hydrated or read
- **THEN** the entire page fails with stable code, retryability and safe details, without skipped target success.

### Requirement: Payload discovery SHALL use bounded candidate pages
Payload discovery SHALL preserve all HTML and attachment candidates without deduplication. It SHALL expose total:null, returned, scanned, hasMore and nextCursor, with an empty nonterminal page permitted. Source HTML SHALL be bounded to 1 MiB UTF-8; encoded payload inputs and decoded payload values SHALL each be bounded to 1 MiB before unbounded allocation or decode. Single payload lookup SHALL preserve complete candidate ambiguity validation.

#### Scenario: Candidate slice contains no payload
- **WHEN** more source candidates remain after a slice containing no payload
- **THEN** the page is empty with hasMore:true and a continuation that advances the source.

#### Scenario: Payload source exceeds a bound
- **WHEN** source or decoded content exceeds its hard bound
- **THEN** the operation fails as resource_limited without returning partial payload summaries.

### Requirement: Saved Search discovery SHALL use portable identity
The Broker SHALL expose library.listSavedSearches with optional libraryId, limit and opaque cursor. The omitted library SHALL resolve to the user library. Rows SHALL contain portable {libraryId,key} refs and display names, with source-bounded identity ordering and 25/100 page limits. Names SHALL NOT serve as control identity.

#### Scenario: Identically named searches exist
- **WHEN** two Saved Searches have the same name
- **THEN** discovery preserves both distinct portable refs.

### Requirement: Broker Host entry SHALL be serial and slice-bounded across instances
All Broker instances and projections SHALL share FIFO admission for native Host critical slices, with maximum native reentry one. Long read/export/capture loops SHALL release admission and yield after at most 100 items or 50 ms, whichever comes first. Network, file preparation, callbacks, detached-data processing, approval and receipt persistence SHALL NOT monopolize Host admission.

#### Scenario: Callback waits while another caller reads
- **WHEN** a traversal callback or translator network request remains pending
- **THEN** another Broker caller can enter a native slice without waiting for that external work.

#### Scenario: Queued read is canceled
- **WHEN** a caller cancels before admission
- **THEN** no native work starts and the call returns stable canceled data.

#### Scenario: Native work outlives cancellation
- **WHEN** an active slice times out or is canceled but native work has not settled
- **THEN** the slice retains admission until settle and no late success is published.

### Requirement: Nontrivial reads SHALL honor trusted call control
Readiness audit, annotation export, traversal, snapshot, metadata translation and ordinary asynchronous reads SHALL check trusted cancellation before Host entry, between bounded items, and after awaited work. Controls SHALL remain outside semantic JSON. Translation SHALL suppress late results without assuming unsupported native abort methods.

#### Scenario: Translation returns after cancellation
- **WHEN** a canceled identifier lookup later produces a result
- **THEN** the result is suppressed and the caller receives stable canceled data.
