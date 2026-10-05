# pi-zotero-tool-catalog Specification

## Purpose

Zotero Native Tools expose reviewed canonical broker capabilities to the Built-in Pi Agent Runtime through its Tool Gateway without transferring Zotero host objects or duplicating broker semantics.

## Requirements

### Requirement: Native catalog exposes only reviewed broker capabilities

The catalog SHALL bind to an explicitly supplied complete Zotero capability broker and owner-scoped managed-file capability. It SHALL retain `context.get_current_view` as `zotero_context_get_current_view` with strict empty-object input among the sixteen reviewed context, library, and metadata read mappings, including Saved Search discovery and bounded lexical item search, and SHALL expose the twenty-three reviewed business mutations when their trusted owner and durable evidence dependencies are supplied. It SHALL expose seven reviewed navigation mappings when transient navigation authority is supplied. Synthesis Client tools SHALL be composed through an independent local catalog. It SHALL NOT expose low-level note payload, generic mutation, or unreviewed Broker members, resolve a global broker, or substitute direct Zotero calls. Inputs SHALL be closed portable JSON objects with no caller-supplied operation identity, owner, signal, native path, callback, prepared resource, storage wrapper, artifact schema, or computed basis; enumeration inputs SHALL use `filter` and search inputs SHALL use `query` with no alias between them.

#### Scenario: Valid current-view call

- **WHEN** an admitted Pi turn calls `zotero_context_get_current_view` with `{}`
- **THEN** it invokes only the injected broker's `context.getCurrentView` and returns its strict-JSON DTO

#### Scenario: Malformed input or missing capability

- **WHEN** a call has an extra field or the required trusted capability is missing
- **THEN** it fails without invoking a Zotero runtime fallback

#### Scenario: Reviewed complete catalog

- **WHEN** a turn freezes the catalog with trusted mutation dependencies and valid navigation authority
- **THEN** it contains sixteen reads, twenty-three mutations and seven navigation tools, with unique names and IDs and no generic note-payload tool

#### Scenario: Reviewed read catalog

- **WHEN** a turn freezes the complete reviewed native read catalog
- **THEN** it retains sixteen unique read capability IDs and tool names, with no note-payload tool

#### Scenario: Read-only composition

- **WHEN** only the complete read dependencies are supplied
- **THEN** only the sixteen read tools are available

#### Scenario: Synthesis resolver extends the read catalog

- **WHEN** an owner supplies the independent Synthesis catalog
- **THEN** the Native catalog retains sixteen reads and the independent Synthesis catalog adds 29 tools with no Native Synthesis dispatch

### Requirement: Canonical reads retain Broker ownership

Selected items, library listing and details, annotation listing, readiness and audit state, and identifier translation SHALL call their matching canonical Broker members. Ordinary read results SHALL retain canonical DTOs and pagination. Identifier translation SHALL claim both `bounded-read` and `external-egress`; other ordinary reads SHALL claim `bounded-read`. Trusted cancellation SHALL be forwarded to the Broker.

#### Scenario: Paged library read

- **WHEN** a caller supplies a legal limit and opaque cursor
- **THEN** the catalog forwards them without constructing a second cursor or reading the whole library

### Requirement: Native file reads use owner-managed delivery

Available attachments in a requested attachment page SHALL be materialized as one owner-scoped batch before the result is published. The result SHALL contain working-copy paths and SHALL NOT contain Zotero source paths. An attachment returned by item detail SHALL expose path-free metadata with `bounded-read` effect; its file SHALL be retrieved through the attachment-page tool. Annotation export SHALL publish one managed file instead of inlining the export. Traversal SHALL append canonical item DTOs to managed NDJSON and publish completed coverage only on completion; resource-limited traversal MAY publish a valid incomplete artifact with resume cursor. Cancellation and other failures SHALL discard partial output or report pending cleanup.

#### Scenario: Attachment page cannot materialize

- **WHEN** one available file in a page fails materialization
- **THEN** the call publishes no attachment page and previously managed files remain intact

#### Scenario: Attachment item detail

- **WHEN** an item-detail request resolves to an attachment with a source file
- **THEN** its result contains metadata and no source or staging path

#### Scenario: Traversal reaches resource limit

- **WHEN** a canonical traversal ends with `resource_limited`
- **THEN** its managed NDJSON is marked incomplete and its result retains the Broker resume cursor without completion evidence

### Requirement: Managed note detail is semantic and bounded

The note-detail tool SHALL return the Broker's complete managed semantic payload in its result when it fits the Tool Gateway limit. It SHALL NOT expose separate note-payload tools, truncate a payload, or change to file delivery. An oversized managed result SHALL fail with typed `resource_limited` and safe size and note-kind facts.

#### Scenario: Oversized managed note

- **WHEN** a managed note detail exceeds the 50 KiB model-visible limit
- **THEN** the tool returns `resource_limited` without a partial payload or automatic file fallback

### Requirement: Native tool errors remain structured and safe

The current-view tool SHALL preserve `code`, `retryable`, and strict-JSON `details` from a Zotero capability error as a bounded structured tool failure. Unknown exceptions SHALL become `internal_error` without exposing a native cause, stack, raw reference, or host object.

#### Scenario: Canonical broker error

- **WHEN** the injected broker raises a Zotero capability error
- **THEN** the Pi tool failure retains its stable code, retryability, and details

#### Scenario: Unknown broker exception

- **WHEN** the injected broker raises an unknown exception
- **THEN** the tool returns a safe `internal_error` failure with no native diagnostic payload

### Requirement: Gateway controls native capability admission and evidence

The Gateway SHALL select the native definition by the turn's available canonical capability IDs, freeze its catalog identity, and retain both the canonical capability ID and Pi tool name in durable attempt evidence. The catalog SHALL NOT own separate authorization, digest, receipt, or lifecycle state.

#### Scenario: Current-view capability unavailable

- **WHEN** a turn's runtime capability receipt omits `context.get_current_view`
- **THEN** the current-view Pi tool is absent and cannot be executed

#### Scenario: Current-view capability admitted

- **WHEN** a turn admits and executes the current-view tool
- **THEN** its attempt evidence contains `context.get_current_view` and `zotero_context_get_current_view`

### Requirement: Business mutation tools have reviewed tiers and preview semantics

The catalog SHALL expose the eleven default item create/metadata/tags/related, ordinary note create/content, collection create/update/membership, and attachment metadata tools. It SHALL expose twelve enhanced item type, attachment import/replace/move, item trash/restore, custom/conversation note and digest/references/citation-analysis/score tools. Enhanced tools SHALL require an additional authorization key; tiers SHALL NOT create new effects. Ordinary execution SHALL claim `zotero-mutation`, and file import/replace also `bounded-read`. Every tool SHALL accept `dryRun`; true SHALL perform complete effect-free domain preview, while omitted or false SHALL preflight and execute. Top-level logical lists and expanded writes SHALL be bounded at 100; duplicates and overlaps SHALL fail, and excess SHALL return `resource_limited` without splitting or truncation. Nested artifact data SHALL retain canonical domain bounds.

#### Scenario: Preview an enhanced mutation

- **WHEN** `dryRun:true` passes preflight
- **THEN** the result contains the actual bounded domain plan without Zotero writes or a write-tier permission request

#### Scenario: Expanded trash exceeds bound

- **WHEN** valid explicit item refs expand to more than 100 writes
- **THEN** no mutation begins and the result is `resource_limited`

### Requirement: Managed authoring uses semantic inputs and stable source identity

Custom and conversation tools SHALL accept a create-parent or update-note target, title and full Markdown replacement. Digest SHALL accept parent and Markdown. References, Citation and Score SHALL reuse canonical semantic fields with version/basis wrappers removed. The Broker SHALL generate opaque IDs for new References once per logical call, permit only explicit IDs present in the current parent artifact, and reject duplicate or unknown IDs. Citation-only writes SHALL validate against the current References basis. Singleton ambiguity SHALL fail without selecting a candidate or mutating storage.

#### Scenario: New references await approval

- **WHEN** a new References write is deferred and continued
- **THEN** generated source IDs remain unchanged

#### Scenario: Unknown retained source ID

- **WHEN** an author supplies an ID absent from the parent's current References
- **THEN** preflight rejects it without creating or updating a note

### Requirement: Mutation results preserve domain evidence without duplication

The trusted owner SHALL durably allocate one operation identity before effect and retain the original source turn across approval continuations. Full domain receipts SHALL be recorded once in canonical transcript before success; Gateway receipts SHALL reference them. Success SHALL project only outcome, receiptId and result within 50 KiB. Unknown or repair-required outcomes SHALL retain bounded residual and recovery facts and SHALL NOT automatically replay.

#### Scenario: Domain receipt persistence fails

- **WHEN** a write may have completed but the domain receipt cannot be made durable
- **THEN** no success is published and the result reports unknown state

### Requirement: Navigation projects the seven reviewed canonical operations

The catalog SHALL explicitly expose zotero_focus_zotero, zotero_select_library_view, zotero_select_collection, zotero_select_saved_search, zotero_reveal_items, zotero_open_item and zotero_open_reader_location with host-control classification and foreground-only, single-per-batch descriptors. Inputs SHALL be the direct canonical portable objects; reveal accepts 1–100 distinct refs, library view uses the six supported kinds, Reader location uses the closed page/annotation/epub union with non-negative pageIndex and a non-empty CFI of at most 4096 characters. Handlers SHALL forward the trusted original target and cancellation outside JSON. Results and stable errors SHALL retain canonical semantics and non-retryability; unknown exceptions SHALL expose no native diagnostics. Content-navigation descriptions SHALL disclose their foreground effect and discourage redundant focus calls.

#### Scenario: Seven canonical mappings execute

- **WHEN** valid foreground calls request each of the seven operations
- **THEN** they reach only their corresponding injected Broker member and return its portable result

#### Scenario: Reader location has an extra field

- **WHEN** a Reader location includes a raw native field or conflicting attachment
- **THEN** the call fails before Broker dispatch

#### Scenario: Navigation fails after first effect

- **WHEN** a Broker call fails after notifying the first-effect boundary
- **THEN** Pi reports unknown certainty without no-effect cancellation or automatic replay

### Requirement: Saved Search discovery uses bounded canonical reads

zotero_library_list_saved_searches SHALL forward libraryId, optional limit and cursor to the Broker, preserving portable saved-search refs, canonical order and paging with default 25 and maximum 100. Saved Search display names SHALL NOT become navigation authority.

#### Scenario: Discover then select a Saved Search

- **WHEN** the Agent reads a bounded Saved Search page and selects a returned ref
- **THEN** the canonical ref reaches navigation unchanged without lookup by name

### Requirement: Native search tools project canonical bounded lexical reads

The catalog SHALL expose `library.search_items` as `zotero_library_search_items` through the Broker's `library.searchItems`. It SHALL claim `bounded-read`, accept closed canonical query and scope/paging inputs, and forward them unchanged. The independent Synthesis catalog SHALL own the existing Synthesis search names.

#### Scenario: Library search dispatches through the Broker

- **WHEN** an admitted turn calls `zotero_library_search_items` with a valid query
- **THEN** it invokes only the injected broker's `library.searchItems` and returns its canonical result DTO

#### Scenario: Query is distinct from enumeration filter

- **WHEN** an enumeration tool receives `query` or a search tool receives `filter`
- **THEN** the closed schema rejects the call without adapting one parameter to the other

#### Scenario: Synthesis search requires the injected client

- **WHEN** an admitted turn calls `zotero_synthesis_search_evidence` or `zotero_topics_search` from the independent Synthesis catalog
- **THEN** that catalog resolves the injected Client lazily and calls only `searchEvidence` or `topics.search`

#### Scenario: Synthesis resolver is absent

- **WHEN** only the Broker Native catalog is supplied
- **THEN** no Synthesis tool is exposed or Client started, and the sixteen Broker reads remain available

#### Scenario: Search envelope and opaque cursor are preserved

- **WHEN** an independent Synthesis search returns a canonical page
- **THEN** status, coverage, issues, total, hasMore and nextCursor remain unchanged without translation, automatic retry or source paths

#### Scenario: Search stays bounded and safe

- **WHEN** search output exceeds 50 KiB or the Client raises a failure
- **THEN** the Synthesis catalog returns resource_limited or a safe structured error, maps internal to internal_error and hides unknown native diagnostics

#### Scenario: Shared canonical search schema

- **WHEN** either catalog declares its reviewed search tool input
- **THEN** it reuses the canonical Synthesis search schema with only reachable definitions

### Requirement: Native file tools claim the owner workspace

File-producing Native tools SHALL claim a non-empty trusted owner output resource key when classified as workspace mutation. Gateway resource validation SHALL remain unchanged.

#### Scenario: File output admission

- **WHEN** an authorized attachment, annotation-export or traversal call is admitted
- **THEN** the Gateway holds the owner workspace claim before file delivery
