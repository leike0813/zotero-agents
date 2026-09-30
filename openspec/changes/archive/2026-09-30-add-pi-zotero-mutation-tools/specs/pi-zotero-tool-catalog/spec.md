## MODIFIED Requirements

### Requirement: Native catalog exposes only reviewed broker capabilities

The catalog SHALL bind to an explicitly supplied complete Zotero capability broker and owner-scoped managed-file capability. It SHALL retain `context.get_current_view` as `zotero_context_get_current_view` with strict empty-object input and the thirteen reviewed context, library, and metadata read mappings, and SHALL expose the twenty-three reviewed business mutations when their trusted owner and durable evidence dependencies are supplied. It SHALL NOT expose low-level note payload, generic mutation, navigation, or unreviewed Broker members, resolve a global broker, or substitute direct Zotero calls. Inputs SHALL be closed portable JSON objects with no caller-supplied operation identity, owner, signal, native path, callback, prepared resource, storage wrapper, artifact schema, or computed basis.

#### Scenario: Valid current-view call
- **WHEN** an admitted Pi turn calls `zotero_context_get_current_view` with `{}`
- **THEN** it invokes only the injected broker's `context.getCurrentView` and returns its strict-JSON DTO

#### Scenario: Malformed input or missing capability
- **WHEN** a call has an extra field or the required trusted capability is missing
- **THEN** it fails without invoking a Zotero runtime fallback

#### Scenario: Reviewed complete catalog
- **WHEN** a turn freezes the catalog with trusted mutation dependencies
- **THEN** it contains fourteen reads and twenty-three mutations, with unique names and IDs and no generic note-payload tool

#### Scenario: Reviewed read catalog
- **WHEN** a turn freezes the complete reviewed native read catalog
- **THEN** it retains fourteen unique read capability IDs and tool names, with no note-payload tool

#### Scenario: Read-only composition
- **WHEN** only the complete read dependencies are supplied
- **THEN** only the fourteen read tools are available

## ADDED Requirements

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
