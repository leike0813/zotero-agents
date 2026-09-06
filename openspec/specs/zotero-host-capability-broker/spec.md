# zotero-host-capability-broker Specification

## Purpose
TBD - created by archiving change define-zotero-host-capability-broker. Update Purpose after archive.
## Requirements
### Requirement: Handlers are internal mutation primitives

The system SHALL treat `handlers` as an internal library for common Zotero mutation operations, not as a complete facade over the Zotero native API.

#### Scenario: Handler scope is described

- **WHEN** developer documentation or future capability specs describe `handlers`
- **THEN** they MUST state that handlers cover a finite write-oriented DSL
- **AND** they MUST NOT imply that handlers cover all Zotero native API capabilities.

### Requirement: Host API is the broker SSOT

The system SHALL treat `ZoteroHostCapabilityBroker` as the canonical owner of JSON-safe Zotero context, navigation, library, metadata, and controlled mutation capabilities. `WorkflowHostApi` SHALL remain the workflow compatibility interface and SHALL expose broker capabilities only through an explicit projection. Host Bridge SHALL consume the canonical broker directly, and MCP SHALL consume the Host Bridge capability mirror.

#### Scenario: A new Zotero capability is added

- **WHEN** a future change adds a Zotero capability intended for workflow package, Host Bridge, CLI, or MCP use
- **THEN** its canonical DTOs and operation signature SHALL be owned by the Zotero Host Capability Broker
- **AND** its workflow exposure SHALL require an explicit `WorkflowHostApi` projection decision
- **AND** its Host Bridge or MCP exposure SHALL require the applicable permission and locality adapter decision.

#### Scenario: Workflow package needs read-only metadata translation

- **WHEN** a workflow package needs Zotero Translate Search metadata for a stable identifier
- **THEN** it SHALL request the lookup through `runtime.hostApi.metadata`
- **AND** the workflow projection SHALL delegate to the canonical broker capability
- **AND** it SHALL NOT require raw `runtime.zotero` access under the package host-api contract.

### Requirement: Workflow hooks use the explicit v12 projection

The system SHALL expose host capabilities to workflow hooks only through the
exact `runtime.hostApi` v12 projection.

#### Scenario: Developer chooses a host capability entry point

- **WHEN** workflow package code needs host capabilities
- **THEN** documentation SHALL direct authors to a named `runtime.hostApi` v12 member
- **AND** `runtime.handlers`, `runtime.zotero`, and host-capable `runtime.helpers` SHALL be absent from hook scope.

### Requirement: MCP tools use JSON-safe broker adapters

The system SHALL expose Zotero MCP tools as JSON-safe adapters over broker
capabilities rather than direct exports of `handlers` or Zotero native APIs.
MCP SHALL be treated as a compatibility adapter over broker capabilities, not
as the primary host capability source.

#### Scenario: Agent calls a Zotero MCP tool

- **WHEN** an MCP client invokes a Zotero tool
- **THEN** the tool response MUST be serializable JSON-compatible data
- **AND** the response MUST NOT contain `Zotero.Item`, `Zotero.Collection`,
  window, `nsIFile`, or other host runtime objects
- **AND** the tool contract MUST be named around an agent task rather than an
  internal handler method.

### Requirement: MCP mutation tools are permission-gated

The system SHALL require an explicit permission policy before exposing Zotero mutations through MCP tools.

#### Scenario: Future MCP write tool is proposed

- **WHEN** a future change proposes a tool that creates, updates, deletes, tags, files, or moves Zotero data
- **THEN** the change MUST define whether the tool requires user confirmation, a configured allow policy, or another explicit permission gate
- **AND** the tool MUST NOT be silently writable by default.

### Requirement: First formal MCP tools are read-oriented

The system SHALL prioritize read/context MCP tools before write tools.

#### Scenario: Formal MCP tool set is expanded beyond the spike

- **WHEN** the first non-spike Zotero MCP tools are implemented
- **THEN** the recommended order SHOULD start with current view, selected items, item search, item detail, notes, and attachments
- **AND** write tools SHOULD be deferred until permission policy is specified.

### Requirement: Broker SSOT document stays synchronized

The system SHALL maintain `doc/components/zotero-host-capability-broker-ssot.md` as the human-facing SSOT for this model.

#### Scenario: Related public contract changes

- **WHEN** `WorkflowHostApi`, `handlers` public behavior, Zotero MCP tool contracts, or MCP mutation permission policy changes
- **THEN** the SSOT document MUST be updated in the same change.

### Requirement: Workflow Host API SHALL Expose Note Image Preparation

The prepared-image owner SHALL accept only the declared file, managed-resource, and base64 portable source variants and SHALL return an opaque workflow-run-scoped prepared-image ref plus bounded JPEG or PNG metadata. It MUST own conversion, registry admission, ref validation, and terminal cleanup without writing the Zotero library or exposing paths, blobs, buffers, or streams.

#### Scenario: Host API exposes image preparation
- **WHEN** a workflow run supplies a valid bounded image source and options
- **THEN** preparation returns an opaque ref, MIME type, dimensions, byte count, and SHA-256 digest
- **AND** the ref resolves only inside the same workflow run

#### Scenario: Prepared-image ref is forged or expired
- **WHEN** a caller supplies a foreign-run or forged ref, or uses a ref after its run terminates
- **THEN** the owner fails with stable `invalid_ref` or `not_found` data identifying only the `prepared_image` target kind
- **AND** no path or prepared bytes are exposed

### Requirement: Workflow Host API SHALL Expose Embedded Image Import

`WorkflowHostApi` SHALL expose a note-level embedded image import operation backed by Zotero embedded-image attachments.

#### Scenario: Workflow imports an embedded note image
- **WHEN** a workflow calls `hostApi.notes.importEmbeddedImage` with a note item and prepared JPEG data
- **THEN** the Host SHALL create an embedded-image attachment under that note
- **AND** the returned value SHALL include the attachment key needed for `<img data-attachment-key="...">`.

### Requirement: MCP adapter is deprecated after Host Bridge CLI completion

After Host Bridge CLI is fully implemented and stable, the system SHALL keep
MCP capabilities and code available for compatibility while removing MCP from
the default ACP host access path.

#### Scenario: ACP run starts after MCP deprecation

- **WHEN** an ACP agent run starts after Host Bridge CLI is the stable host
  access path
- **THEN** the plugin SHALL NOT start MCP by default
- **AND** it SHALL NOT inject MCP descriptors into the agent run by default
- **AND** it SHALL NOT run MCP preflight as part of normal ACP run preparation.

#### Scenario: ACP UI is shown after MCP deprecation

- **WHEN** the ACP panel renders host access state after MCP deprecation
- **THEN** it SHALL NOT show the MCP status indicator as part of the normal run
  status surface
- **AND** MCP diagnostics MAY remain available through explicit developer or
  compatibility tooling.

### Requirement: Workflow Host API SHALL Support Binary Workflow Files

`WorkflowHostApi.file` SHALL expose binary file operations for workflow packages
that need to round-trip sidecar artifacts without embedding bytes in JSON.

#### Scenario: Workflow writes binary sidecar artifact
- **WHEN** a workflow package receives the current Workflow Host API
- **THEN** `hostApi.file.readBytes`, `hostApi.file.writeBytes`, and `hostApi.file.copy` SHALL be available
- **AND** those operations SHALL support local workflow sidecar files such as representative note images.

### Requirement: Workflow Host API SHALL expose a save-file picker

`WorkflowHostApi.file` SHALL expose a save-file operation accepting a title, filters, initial directory, and suggested filename, backed by Zotero's file picker save mode.

#### Scenario: Workflow requests a ZIP destination
- **WHEN** a workflow calls the save-file operation with a `.zip` suggestion and filter
- **THEN** the Host SHALL return the confirmed target path, including replacement confirmation handled by the native picker
- **AND** cancellation SHALL return `null`.

### Requirement: Workflow Host API SHALL expose safe streaming ZIP operations

The Host SHALL expose workflow-agnostic ZIP writing and scoped extraction operations implemented with Zotero/Gecko facilities and SHALL NOT require Node.js archive or filesystem modules in the plugin environment.

#### Scenario: Workflow writes file-backed archive entries
- **WHEN** a workflow supplies normalized entry names backed by local file paths, text, or bytes
- **THEN** the Host SHALL stream entries to a temporary archive and replace the target only after the archive closes successfully
- **AND** large attachments SHALL NOT require assembling the complete ZIP in JavaScript memory.

#### Scenario: Workflow opens a ZIP in an extraction scope
- **WHEN** a workflow requests scoped ZIP extraction
- **THEN** the Host SHALL reject absolute, parent-traversing, empty, duplicate, and otherwise unsafe entry names before exposing extracted files
- **AND** the Host SHALL remove the temporary extraction directory after the scoped callback settles.

#### Scenario: Workflow measures extracted archive entries
- **WHEN** a workflow requests integrity metadata for enumerated entry names inside an extraction scope
- **THEN** the Host SHALL read and hash those files without exposing host paths or transferring file bytes through the package boundary
- **AND** it SHALL reject unsafe, duplicate, or non-enumerated entry names.

### Requirement: Workflow Host API SHALL expose portable item materialization primitives

The Host SHALL expose generic operations to export complete Zotero item JSON, create a new item from sanitized Zotero JSON in an explicit library, remove a created item, import a local path and sidecars as a stored-file attachment under a parent, and create a URL attachment with caller-controlled deduplication.

#### Scenario: Workflow exports complete item JSON
- **WHEN** a workflow requests portable JSON for a regular item
- **THEN** the Host SHALL serialize all Zotero item fields, creators, and tags rather than the summary-only broker DTO
- **AND** it SHALL remove source identity, collection, and raw relation fields according to the portable item contract.

#### Scenario: Workflow creates a portable parent item
- **WHEN** a workflow supplies an item type and sanitized Zotero JSON without source identity fields
- **THEN** the Host SHALL create a new item in the requested library using Zotero item JSON normalization
- **AND** it SHALL return the new item with its target id and key.

#### Scenario: Workflow imports a source path as stored content
- **WHEN** a workflow supplies a readable local path, optional companion files, parent ref, title, content type, charset, and optional URL metadata
- **THEN** the Host SHALL create a stored-file attachment using Zotero attachment import APIs
- **AND** companion files SHALL be materialized inside that attachment's Zotero storage directory at safe relative paths
- **AND** it SHALL NOT create a linked-file attachment to the supplied temporary path.

#### Scenario: Workflow creates duplicate URL attachments intentionally
- **WHEN** a workflow requests URL attachment creation with deduplication disabled
- **THEN** the Host SHALL create a new URL attachment even when the parent already has an attachment with the same URL.

#### Scenario: Workflow cleans up a failed parent
- **WHEN** a workflow asks the Host to remove a parent created during the current operation
- **THEN** the Host SHALL erase that parent and its newly created children through Zotero's transactional item APIs.

### Requirement: Workflow Host API v12 current view SHALL identify selected library-tree sources

The current-view DTO SHALL include ordered JSON-safe source refs for the selected library-tree rows and all distinct selected library ids. It SHALL include the scalar library id only when exactly one library is represented, and the optional normalized current collection only when the entire selection represents one real Zotero collection. Zotero host-version differences SHALL be contained inside the broker. Sources SHALL use libraryIds/selectedSources in the canonical small current-view DTO, Saved Search identity SHALL be a portable libraryId/key ref, and item selection arrays SHALL NOT be embedded.

#### Scenario: One real collection row is selected
- **WHEN** the current Zotero library view contains exactly one selected real collection
- **THEN** `context.getCurrentView()` SHALL include one collection source with its portable ref, name, and library id
- **AND** it SHALL include that collection as the current collection
- **AND** it SHALL report the unique library id

#### Scenario: Multiple rows are selected in Zotero 10
- **WHEN** Zotero reports multiple selected library-tree rows
- **THEN** `context.getCurrentView()` SHALL preserve their host-visible order as portable source refs
- **AND** it SHALL omit the current collection
- **AND** it SHALL omit the scalar library id when more than one library is represented

#### Scenario: Legacy host exposes only one selected row
- **WHEN** Zotero 7 or Zotero 9 provides only the legacy single-row selection shape
- **THEN** the broker SHALL project that row through the same plural DTO
- **AND** downstream Workflow Host, Host Bridge, and MCP projections SHALL NOT branch on the Zotero major version

#### Scenario: Non-collection row is selected
- **WHEN** a selected row represents a library root, saved search, feed, trash, reader, or another non-collection view
- **THEN** the source list SHALL identify its supported portable source kind or a bounded special-view ref
- **AND** the current-view DTO SHALL omit the current collection
- **AND** it SHALL still report unique library identity when available

### Requirement: Workflow Host API version consumers SHALL recognize v12

The current Workflow Host Contract Identity SHALL declare version 12 once. Internally created workflow projections, loader globals, runtime contexts, capability summaries, debug probes, tests, and current SSOT documentation SHALL resolve that version from the identity owner rather than maintaining independent current-version declarations.

#### Scenario: Current projection is carried into a workflow runtime

- **WHEN** the system creates or injects the current Workflow Host projection without an explicit compatibility override
- **THEN** the runtime, loader global, and diagnostics SHALL report version 12
- **AND** the reported version SHALL agree with the projection's own version.

#### Scenario: Explicit legacy version is supplied

- **WHEN** a test or legacy adapter supplies an explicit finite Workflow Host version
- **THEN** that explicit version SHALL take precedence over the selected projection's version
- **AND** an unidentifiable external adapter SHALL remain unknown rather than being reported as the current version.

#### Scenario: Built-in package checks its compatibility policy

- **WHEN** the self-contained built-in package resolves a Workflow Host version
- **THEN** versions 2 through the current version SHALL pass its declared compatibility range
- **AND** versions outside that range SHALL fail deterministically
- **AND** conformance verification SHALL fail when the range no longer accepts the current contract identity.

### Requirement: Workflow Host contract variants SHALL have explicit capability conformance

The system SHALL distinguish interactive and non-interactive Workflow Host Contract Variants from hook execution modes. Conformance gates SHALL validate each variant against the declared top-level capability identities without turning the production runtime into an eager whole-contract rejection path.

#### Scenario: Interactive projection is checked

- **WHEN** conformance verifies the interactive projection
- **THEN** every declared interactive capability SHALL be present
- **AND** `resources` MAY be absent.

#### Scenario: Non-interactive projection is checked

- **WHEN** conformance verifies the non-interactive projection
- **THEN** `resources` SHALL be present
- **AND** interactive picker and editor members SHALL remain structurally available while interaction attempts fail with `workflow_interaction_required`.

#### Scenario: Projection shape drifts

- **WHEN** a tested projection omits a variant-required top-level capability or exposes an undeclared top-level capability
- **THEN** conformance SHALL return structured missing or unexpected capability identities
- **AND** the test/build gate SHALL fail.

### Requirement: Workflow Host capability summaries SHALL report observed availability

Workflow Host capability summaries SHALL be runtime observations derived from the declared capability identities. A summary SHALL NOT define the contract identity or silently omit a declared top-level capability.

#### Scenario: Variant summary is emitted

- **WHEN** loader, runtime, input-planning, or debug diagnostics summarize a selected Workflow Host projection
- **THEN** they SHALL use the shared identity owner
- **AND** the summary SHALL preserve existing diagnostic fields while reporting `command` and `resources` availability.

### Requirement: Active Workflow Host documentation SHALL declare only the current version

Current SSOT documentation and active OpenSpec SHALL describe the current Workflow Host contract. Archived changes MAY retain historical version declarations.

#### Scenario: Documentation version declarations are checked

- **WHEN** the contract governance test scans explicit `Workflow Host API vN` declarations in current SSOT documentation and active OpenSpec
- **THEN** every declaration SHALL match the current contract identity version
- **AND** archived change documents SHALL be excluded.

### Requirement: Workflow Host file pickers SHALL use a valid native parent context

Before invoking a toolkit-backed or native Zotero file picker, the shared host
file-picker boundary SHALL select an open parent window with a browsing context.
It SHALL skip unavailable dialog and preferences windows and fall back to the
Zotero main window when that window is usable. This requirement applies to
directory, single-file, save-file, and multi-file picker modes.

#### Scenario: Stale dialog window falls back to the main window

- **WHEN** the preferred dialog window is closed or lacks a browsing context
- **THEN** the host SHALL pass the usable Zotero main window to the picker

#### Scenario: Live dialog window remains the picker parent

- **WHEN** the preferred dialog window is open and has a browsing context
- **THEN** the host SHALL pass that dialog window to the picker

### Requirement: Workflow broker projection is explicit and closed

`WorkflowHostApi` SHALL expose only the broker members declared by its public v12 contract. Adding a canonical broker member SHALL NOT implicitly add it to the workflow interface.

#### Scenario: Broker gains a new member

- **WHEN** a capability family gains a new broker operation
- **THEN** existing workflow host objects SHALL not expose that operation unless the workflow projection is explicitly updated
- **AND** runtime workflow objects SHALL not contain undeclared broker members.

### Requirement: Workflow Host runtime adaptation uses owned deep modules

Workflow Host API v12 SHALL compose workflow-local filesystem, input
materialization, picker, note-image preparation, stored-attachment import, and
archive behavior through explicitly owned modules. Runtime adapter selection and
workflow-local policy SHALL NOT be implemented inline in the projection
composition root or exposed as new public host members.

#### Scenario: Workflow Host API is constructed

- **WHEN** `createWorkflowHostApi()` constructs the v12 projection
- **THEN** it SHALL bind each workflow-local interface explicitly
- **AND** it SHALL NOT expose internal filesystem, picker, media, or attachment
  adapters.

#### Scenario: Host projection performs a runtime operation

- **WHEN** a Workflow Host API invokes a runtime-sensitive operation
- **THEN** the owning module SHALL resolve the current runtime adapter for that
  invocation
- **AND** it SHALL NOT retain a stale picker window or runtime global captured
  during initial composition.

### Requirement: Stored attachment companion import fails closed

Workflow stored-attachment import SHALL validate and stage every companion file
before creating a Zotero attachment. A failure after attachment creation SHALL
trigger best-effort removal of the newly created attachment and cleanup of
managed staging data.

#### Scenario: Companion path is unsafe

- **WHEN** a stored-attachment import includes an absolute, empty, or traversal
  companion path
- **THEN** the import SHALL fail before creating a Zotero attachment
- **AND** no companion file SHALL be written to Zotero storage.

#### Scenario: Companion copy fails after attachment creation

- **WHEN** staged companion content cannot be copied into the new attachment
  storage directory
- **THEN** the operation SHALL report the primary failure
- **AND** it SHALL attempt to remove the new attachment and clean staging data.

### Requirement: Workflow note-image preparation remains behavior compatible

Moving note-image preparation behind its owned module SHALL retain the established resize, encoding, quality-candidate, MIME verification, and hard-cap policy as internal conversion behavior while exposing only portable sources, opaque managed results, per-run accounting, and automatic cleanup. Native Blob and typed-array inputs MUST NOT enter the owner contract.

#### Scenario: Workflow prepares a note image

- **WHEN** an active v12 caller supplies a portable image source
- **THEN** the owner normalizes it through the owned conversion path and returns an opaque prepared-image ref
- **AND** the owner itself remains portable and does not accept a native Blob or typed array

### Requirement: Broker public references SHALL be portable and fail closed

The Zotero Host Capability Broker SHALL accept only portable JSON item and collection references at its public seam. Raw Zotero items and collections MAY be normalized only inside the trusted Workflow Host adapter and MUST NOT enter Broker DTOs, errors, receipts, or durable evidence.

#### Scenario: Raw item reaches the Broker

- **WHEN** a caller submits a raw Zotero item through the Broker public interface
- **THEN** the Broker rejects it with `invalid_ref` and does not serialize or retain the raw value

### Requirement: Broker errors SHALL conform to the shared Workflow Host contract

`ZoteroHostCapabilityError` SHALL remain the canonical runtime exception for Zotero capability semantics while using the shared code, retryability, and closed-details schema.

#### Scenario: Native Zotero operation fails

- **WHEN** a Broker operation fails with a native exception
- **THEN** the Broker returns or throws the appropriate shared coded failure without exposing the native cause, stack, local path, or raw input

### Requirement: Broker growth SHALL not widen Workflow Host implicitly

Workflow Host projections SHALL select Broker members through member-level declarations and explicit object literals. Adding a Broker member MUST leave every Workflow Host variant unchanged until a contract/version change names that member.

#### Scenario: Broker gains an internal capability

- **WHEN** a new member is added to the Broker implementation
- **THEN** recursive Workflow Host conformance still reports the previously declared surface and does not inherit the member

### Requirement: Broker SHALL own canonical bounded library reads
The Broker SHALL own item, collection, note, payload, attachment, annotation, and portable-export reads, including validation, serialization, fixed ordering, resource limits, and coded failure behavior. Workflow callers MUST NOT enumerate raw Zotero objects or reconstruct these DTOs.

#### Scenario: Item detail is requested
- **WHEN** a portable item reference identifies a current regular item, note, attachment, or annotation
- **THEN** the Broker returns the matching discriminated detail variant with one canonical revision and no raw host object

#### Scenario: Read cannot prove complete tags
- **WHEN** tag loading fails or exceeds the contract bound
- **THEN** the Broker fails closed rather than returning an empty or truncated complete tag set

### Requirement: Broker SHALL own live traversal completion evidence
The Broker SHALL enumerate live library pages, apply fixed criteria and budgets, invoke one serial batch callback at a time, and issue completion evidence only after the cursor is proven exhausted.

#### Scenario: Traversal exhausts the cursor
- **WHEN** every matching item has been delivered successfully
- **THEN** the result is `completed` and includes criteria and coverage digests bound to the delivered item revisions and tags

#### Scenario: Traversal stops at a budget
- **WHEN** max items, pages, or duration is reached before exhaustion
- **THEN** the result is `resource_limited`, includes a criteria-bound resume cursor, and contains no completion evidence
### Requirement: Broker SHALL own canonical mutation admission and evidence

The Broker SHALL reserve accepted mutation operations by caller scope and `operationId`, bind each reservation to a canonical request digest, serialize competing replays, verify final Host state, and retain bounded process-local outcomes. It MUST NOT persist a mutation ledger or expose registry records.

#### Scenario: Same operation is replayed with the same request

- **WHEN** a caller repeats an accepted `operationId` with the same canonical request in the same Host process
- **THEN** the Broker returns or waits for the original outcome without executing a second write

#### Scenario: Same operation identity carries different input

- **WHEN** a caller reuses an accepted `operationId` with a different canonical request digest
- **THEN** the Broker returns a conflict with reason `idempotency_conflict` before another write begins

### Requirement: Broker SHALL distinguish pre-admission errors from accepted attempts

Invalid or unaccepted requests MAY fail through the shared error contract. After operation reservation succeeds, every terminal failure, cancellation, ambiguity, or repair condition SHALL return structured attempt evidence instead of only throwing.

#### Scenario: Commit state cannot be confirmed

- **WHEN** an accepted write may have committed but final state cannot be proven
- **THEN** the result is `unknown`, names reconciliation as recovery, and forbids blind replay

#### Scenario: Compensation leaves known residue

- **WHEN** rollback fails and residual effects are confirmed
- **THEN** the result is `repair_required` with bounded residual evidence

### Requirement: Broker SHALL own native bibliography rendering semantics

The Broker SHALL provide one bibliography deep-module owner for format availability and native Zotero export rendering. Workflow composition and Research Bundle generation MUST project or consume that owner explicitly and MUST NOT copy translator selection, fallback, option validation, or native error normalization.

#### Scenario: Another Broker capability is added
- **WHEN** the Broker gains a capability unrelated to bibliography
- **THEN** the bibliography surface remains unchanged until explicitly projected
- **AND** no whole-Broker alias or inferred registry widens Workflow Host

#### Scenario: Research Bundle needs a bibliography artifact
- **WHEN** Research Bundle generation requests bibliography content
- **THEN** it consumes the bibliography owner result
- **AND** it retains ownership only of artifact naming and bundle layout
