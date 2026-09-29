# Spec Delta

## MODIFIED Requirements

### Requirement: Native catalog exposes only reviewed broker capabilities

The catalog SHALL bind to an explicitly supplied complete Zotero capability broker and owner-scoped managed-file capability. It SHALL expose `context.get_current_view` as `zotero_context_get_current_view` with a strict empty-object input and `bounded-read` effect, plus the thirteen reviewed context, library, and metadata read mappings. It SHALL NOT expose low-level note payload, generic mutation, navigation, or unreviewed Broker members, resolve a global broker, or substitute a direct Zotero call when its broker is incomplete. Inputs SHALL be closed, portable JSON objects with canonical pagination and no caller-supplied owner, signal, native path, or callback.

#### Scenario: Valid current-view call
- **WHEN** an admitted Pi turn calls `zotero_context_get_current_view` with `{}`
- **THEN** the call invokes only the injected broker's `context.getCurrentView` and returns its strict-JSON DTO unchanged inside the Gateway result

#### Scenario: Malformed input or missing capability
- **WHEN** a call has an extra input field or the broker does not provide the required member
- **THEN** the call fails without invoking a Zotero runtime fallback

#### Scenario: Reviewed read catalog
- **WHEN** a turn freezes the complete reviewed native read catalog
- **THEN** it contains exactly fourteen unique capability IDs and tool names, with no note-payload tool

## ADDED Requirements

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
