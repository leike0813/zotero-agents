# synthesis-tag-vocabulary Specification

## Purpose
TBD - created by archiving change add-synthesis-kg-tag-vocabulary. Update Purpose after archive.

## Requirements

### Requirement: Canonical tag vocabulary files are initialized and persisted

Synthesis Tag Vocabulary SHALL store its canonical state under `synthesis/tags/` using plugin-safe runtime persistence and the Synthesis foundation transaction boundary.

#### Scenario: Empty tag vocabulary store is initialized

- **WHEN** the tag vocabulary service loads against a KG store without tag assets
- **THEN** it SHALL initialize readable canonical assets for vocabulary, aliases, abbrev, protocol, and manifest
- **AND** it SHALL keep the files under `synthesis/tags/`.

#### Scenario: Valid vocabulary transaction commits

- **WHEN** a valid vocabulary update writes one or more tag assets
- **THEN** the service SHALL commit through the foundation canonical transaction helper
- **AND** it SHALL return a receipt with changed relative asset paths.

#### Scenario: Invalid vocabulary transaction is rejected

- **WHEN** a vocabulary update contains invalid protocol data
- **THEN** the service SHALL reject the update
- **AND** it SHALL NOT replace the existing target asset.

### Requirement: Tag protocol validation is deterministic


Synthesis Tag Vocabulary SHALL validate tag entries through the configured Tag Vocabulary engine against the TagVocab-compatible protocol before committing canonical state.

#### Scenario: Invalid tag format is reported

- **WHEN** an entry tag does not match `^[a-z_]+:[a-zA-Z0-9/_.-]+$`
- **THEN** engine validation SHALL return a structured warning for that tag
- **AND** the warning SHALL identify the failing code and tag value.

#### Scenario: Unknown facet is reported

- **WHEN** an entry facet is not one of `field`, `topic`, `method`, `model`, `ai_task`, `data`, `tool`, or `status`
- **THEN** engine validation SHALL return a structured warning for that tag
- **AND** committing the invalid state SHALL fail inside the existing repository transaction.

#### Scenario: Deprecated replacement is checked

- **WHEN** a deprecated entry declares a replacement tag that is missing from the vocabulary
- **THEN** engine validation SHALL return a warning tied to the deprecated tag.

### Requirement: Tag vocabulary import uses merge preview on conflicts

Synthesis Tag Vocabulary SHALL import TagVocab-compatible payloads through an explicit preview and apply workflow.

#### Scenario: Preview is non-mutating

- **WHEN** a Workbench user previews an import payload
- **THEN** the preview SHALL expose additions, removals, and conflicts in the UI snapshot
- **AND** canonical tag vocabulary assets SHALL NOT change.

#### Scenario: Explicit import action commits

- **WHEN** the user applies `use-imported` or `merge-non-conflicting`
- **THEN** the service SHALL commit the resulting canonical vocabulary through the foundation transaction boundary
- **AND** a successful commit SHALL be eligible for coalesced WebDAV autosync.

#### Scenario: Conflicts are not silently replaced

- **WHEN** the preview contains conflicts and the user has not applied an explicit action
- **THEN** local canonical vocabulary SHALL remain unchanged.

### Requirement: Tag index projection is rebuildable


Synthesis Tag Vocabulary SHALL use the configured Tag Vocabulary engine to build the rebuildable `tag-index` projection model for lookup, alias, abbrev, validation, and search data.

#### Scenario: Canonical vocabulary change marks projection stale

- **WHEN** a vocabulary transaction commits
- **THEN** the `tag-index` projection SHALL be marked stale in the foundation projection registry.

#### Scenario: Projection rebuild records state

- **WHEN** the Tag Vocabulary engine returns a strictly rebuilt index for the current manifest basis
- **THEN** the projection registry SHALL record schema version, source manifest hash, stale flag, last rebuild time, and diagnostics.

#### Scenario: Projection computation fails

- **WHEN** the configured engine throws, is cancelled, exceeds bounds, or returns a malformed result
- **THEN** the previous projection registry state SHALL remain unchanged.

#### Scenario: Projection cache is deleted

- **WHEN** local projection cache state is missing
- **THEN** the service SHALL be able to rebuild lookup data from canonical SQLite state.

### Requirement: Tag vocabulary export serves tag-regulator

Synthesis Tag Vocabulary SHALL provide the only host vocabulary export used by
the builtin tag-regulator workflow.

#### Scenario: Export strips management metadata

- **WHEN** tag-regulator requests controlled tags
- **THEN** the export SHALL contain active canonical tag strings in
  deterministic order
- **AND** it SHALL exclude note, source, deprecated, staged, and UI-only
  metadata.

#### Scenario: No active tags exist

- **WHEN** canonical Synthesis tag vocabulary has no active tags
- **THEN** tag-regulator request building SHALL fail deterministically
- **AND** it SHALL NOT fall back to legacy prefs-backed vocabulary state.

### Requirement: Tag vocabulary diagnostics are sanitized

Synthesis Tag Vocabulary SHALL persist diagnostics without leaking tokens, secrets, or raw absolute runtime paths.

#### Scenario: Failure diagnostics include sensitive input

- **WHEN** validation or persistence failure details contain tokens, secrets, or absolute paths
- **THEN** persisted diagnostics SHALL redact sensitive values
- **AND** diagnostics SHALL retain only safe scope, relative path, hash, code, and concise reason fields.

### Requirement: Synthesis tag vocabulary follows TagVocab v1

Synthesis Tag Vocabulary SHALL treat Zotero TagVocab v1 as the canonical vocabulary protocol for tag entries, facets, abbreviation registry, and source JSON shape.

#### Scenario: Protocol-native vocabulary imports

- **WHEN** an import payload contains top-level `tags`, `facets`, and `abbrevs`
- **THEN** the service SHALL parse the `tags` array as controlled vocabulary entries
- **AND** the preview SHALL expose non-empty additions or conflicts when valid entries exist.

#### Scenario: Legacy import shapes remain readable

- **WHEN** an import payload contains top-level `entries` or is itself an array
- **THEN** the service SHALL parse it as a compatibility input
- **AND** it SHALL apply the same TagVocab validation rules before commit.

#### Scenario: Canonical vocabulary uses TagVocab field names

- **WHEN** a new tag vocabulary transaction commits
- **THEN** `synthesis/tags/vocabulary.json` SHALL contain a TagVocab-compatible `tags` array
- **AND** it SHALL include protocol metadata sufficient to identify the TagVocab version, facets, updated time, abbreviation registry, and tag count.

#### Scenario: Existing legacy canonical files remain readable

- **WHEN** an existing canonical vocabulary file contains `entries`
- **THEN** the service SHALL load it without data loss
- **AND** subsequent writes SHALL use the TagVocab-compatible canonical shape.

### Requirement: TagVocab validation covers abbreviation casing

Synthesis Tag Vocabulary SHALL validate registered abbreviations according to the TagVocab abbreviation registry.

#### Scenario: Registered abbreviation uses canonical casing

- **WHEN** an entry tag contains a segment whose lowercase form exists in `abbrevs`
- **THEN** the segment SHALL use the registry value casing
- **AND** valid examples such as `ai_task:NER`, `model:DL/CNN`, and `data:LiDAR` SHALL pass when the registry defines those abbreviations.

#### Scenario: Registered abbreviation uses incorrect casing

- **WHEN** an entry tag contains a registered abbreviation segment with non-canonical casing
- **THEN** validation SHALL return a structured `abbrev_case_error`
- **AND** committing the invalid vocabulary SHALL fail.

### Requirement: TagVocab import preserves explicit merge behavior

Synthesis Tag Vocabulary SHALL map TagVocab import semantics into the existing explicit preview/apply workflow.

#### Scenario: Preview is non-mutating

- **WHEN** a Workbench user previews a TagVocab `tags/tags.json` payload
- **THEN** canonical vocabulary files SHALL NOT change.

#### Scenario: Explicit merge commits additions

- **WHEN** the user applies `merge-non-conflicting`
- **THEN** only non-conflicting imported tags SHALL be added to local canonical vocabulary.

#### Scenario: Explicit imported state replaces matching entries

- **WHEN** the user applies `use-imported`
- **THEN** imported entries SHALL replace local entries with the same tag
- **AND** local-only entries SHALL remain present.

### Requirement: Tag-regulator export remains stable

Synthesis Tag Vocabulary SHALL preserve the tag-regulator host contract while using TagVocab canonical storage internally.

#### Scenario: Tag-regulator requests valid tags

- **WHEN** tag-regulator calls the synthesis vocabulary export
- **THEN** the result SHALL be a deterministic array of active canonical tag strings
- **AND** it SHALL omit deprecated entries and management metadata.

### Requirement: Synthesis Tags page is a table-first workbench

The Synthesis Workbench Tags page SHALL present tag management as a summary bar
and table work area without a separate inspector panel.

#### Scenario: User opens Tags page

- **WHEN** the Tags page is rendered
- **THEN** it SHALL show a summary bar with canonical tag count, staged
  suggestion count, validation warning count, and tag cache state
- **AND** it SHALL show table-first Vocabulary and Staged subviews.

#### Scenario: User reviews canonical vocabulary

- **WHEN** the Vocabulary subview is active
- **THEN** canonical tag details such as tag, facet, status, usage, source,
  note, aliases, abbreviations, and warnings SHALL be visible in the table or
  expanded row content
- **AND** no separate tag inspector SHALL be required.

#### Scenario: User reviews staged suggestions

- **WHEN** the Staged subview is active
- **THEN** staged rows SHALL support search, facet filtering, multi-select,
  row-level promote/discard, and bulk promote/discard
- **AND** clear all SHALL require explicit user confirmation.

#### Scenario: User edits a staged suggestion

- **WHEN** a staged tag suffix or note is edited
- **THEN** the UI SHALL keep the draft visible while the update is pending
- **AND** it SHALL show saved or failed state inline without using an inspector.

#### Scenario: User opens Tags actions

- **WHEN** the Tags action bar is rendered
- **THEN** it SHALL include Validate, Export, and Import actions
- **AND** it SHALL NOT expose `rebuildTagVocabularyIndex`.

### Requirement: Synthesis tag vocabulary owns staged regulator suggestions


Synthesis Tag Vocabulary SHALL store and manage staged `tag-regulator` suggestions as part of the Synthesis tag vocabulary domain, and current parent bindings SHALL be canonical stable item refs.

#### Scenario: Regulator stages a suggestion
- **WHEN** tag-regulator stages a suggested tag
- **THEN** Synthesis Tag Vocabulary SHALL persist the staged entry with tag, facet, note, source flow, and stable parent refs when provided
- **AND** the staged entry SHALL be readable through the Synthesis service API

#### Scenario: Existing staged suggestion is staged again
- **WHEN** the same tag is staged more than once
- **THEN** Synthesis Tag Vocabulary SHALL merge, deduplicate, and deterministically sort stable parent refs
- **AND** it SHALL NOT create duplicate staged rows for the same tag ignoring case

#### Scenario: New request carries numeric binding
- **WHEN** a stage or update request carries a numeric parent binding
- **THEN** the request SHALL fail as invalid
- **AND** staged state SHALL remain unchanged

#### Scenario: Legacy numeric rows are present
- **WHEN** staged storage contains legacy numeric parent bindings
- **THEN** Synthesis SHALL resolve and atomically rewrite them before staged operations continue
- **AND** missing targets SHALL remove only their binding while preserving the staged tag

#### Scenario: Legacy migration is unavailable
- **WHEN** the migration port is missing, fails, or returns a malformed result
- **THEN** the stored row SHALL remain unchanged
- **AND** staged list, update, and promote operations SHALL fail with stable unavailable diagnostics

### Requirement: Synthesis tag vocabulary promotes staged suggestions

Synthesis Tag Vocabulary SHALL promote selected staged suggestions into the canonical controlled vocabulary through the normal canonical write boundary, SHALL preserve case-insensitive canonical uniqueness, and SHALL dispatch stable bound-parent Tag effects after commit.

#### Scenario: Staged suggestion is promoted
- **WHEN** a user or workflow promotes a staged tag
- **THEN** the tag SHALL be added to canonical vocabulary if not already active
- **AND** the staged entry SHALL be removed after a successful commit
- **AND** bound-parent effects SHALL run only after that commit

#### Scenario: Selected suggestions differ only by case
- **WHEN** one promotion selects multiple staged spellings of the same case-insensitive tag
- **THEN** the first selected spelling SHALL supply the canonical entry and its descriptive metadata
- **AND** bindings from all selected variants SHALL be merged, deduplicated, and deterministically ordered
- **AND** every selected variant SHALL be consumed by the successful promotion
- **AND** non-winning variants SHALL be reported as skipped
- **AND** each unique bound parent SHALL receive exactly one effect for the winning spelling

#### Scenario: Canonical spelling already exists
- **WHEN** a selected staged suggestion matches an active canonical tag ignoring case
- **THEN** every selected variant in that case-insensitive group SHALL be reported as skipped
- **AND** the staged variants SHALL remain available for user action

#### Scenario: Invalid staged suggestion is promoted
- **WHEN** a staged tag violates the active tag protocol
- **THEN** promotion SHALL fail with validation diagnostics
- **AND** canonical vocabulary and Host targets SHALL remain unchanged

#### Scenario: Host effect is unavailable
- **WHEN** canonical promotion succeeds but the Tag effect port is absent, throws, or returns malformed receipts
- **THEN** promotion SHALL remain committed
- **AND** the result SHALL contain bounded stable diagnostics without raw Host errors

#### Scenario: Host effect satisfies a target
- **WHEN** a receipt is `applied` or `already_satisfied`
- **THEN** `applied_parent_tags` SHALL identify the tag and stable `parent_ref`
- **AND** no numeric item ID SHALL appear in the result

### Requirement: Synthesis tag vocabulary supports staged discard

Synthesis Tag Vocabulary SHALL allow staged suggestions to be discarded without
changing canonical vocabulary.

#### Scenario: Staged suggestion is discarded

- **WHEN** a staged tag is discarded
- **THEN** it SHALL be removed from staged state
- **AND** canonical vocabulary SHALL remain unchanged.

### Requirement: Synthesis Workbench Tags owns staged inbox management

The Synthesis Workbench Tags page SHALL provide the only builtin UI surface for
viewing and managing staged `tag-regulator` suggestions.

#### Scenario: User views staged suggestions

- **WHEN** the Tags page is opened
- **THEN** it SHALL expose Vocabulary and Staged subviews
- **AND** the Staged subview SHALL display the staged suggestion count
- **AND** staged rows SHALL include tag, facet, note, parent binding count,
  source flow, and update timestamp when available.

#### Scenario: User filters staged suggestions

- **WHEN** a user searches staged suggestions or selects a staged facet filter
- **THEN** the Tags page SHALL filter staged rows without changing canonical
  vocabulary or staged state.

#### Scenario: User edits a staged suggestion

- **WHEN** a user edits a staged tag suffix or note from the Staged subview
- **THEN** the change SHALL be persisted through Synthesis staged suggestion
  APIs
- **AND** the Tags surface SHALL refresh from Synthesis state.

#### Scenario: User promotes a staged suggestion from Workbench

- **WHEN** a user promotes a staged suggestion from the Staged subview
- **THEN** Synthesis SHALL promote the suggestion through the canonical write
  boundary
- **AND** it SHALL apply the promoted tag to bound parent items when they exist.

#### Scenario: User discards staged suggestions from Workbench

- **WHEN** a user discards one staged suggestion or clears all staged
  suggestions
- **THEN** Synthesis SHALL remove only staged state
- **AND** clear all SHALL require explicit user confirmation in the Workbench UI.

#### Scenario: Duplicate canonical tag is promoted

- **WHEN** a staged suggestion already exists as an active canonical tag
- **THEN** promotion SHALL report it as skipped
- **AND** the staged row SHALL remain available for user action.

### Requirement: Canonical tag writes schedule WebDAV autosync

Successful canonical TagVocab imports, staged promotions, and other durable tag mutations SHALL enter the shared WebDAV autosync maintenance epoch after their write transaction succeeds.

#### Scenario: Tag vocabulary mutation commits

- **WHEN** a canonical tag vocabulary mutation commits successfully
- **THEN** it SHALL schedule the same coalesced WebDAV autosync opportunity as
  other canonical service writes
- **AND** notification failure SHALL NOT roll back the tag mutation.

### Requirement: Synthesis Workbench SHALL identify and protect builtin status rows
The Workbench MUST expose builtin identity in its row model and render a builtin marker. It MUST disable tag/facet identity editing and deletion while keeping note and existing aliases governance available.

#### Scenario: User edits a builtin row
- **WHEN** a builtin status row is selected
- **THEN** tag and facet identity controls and delete action SHALL be unavailable
- **AND** note editing SHALL remain available

#### Scenario: User manages a custom status row
- **WHEN** a non-builtin `status:*` row is selected
- **THEN** ordinary edit and delete operations SHALL remain available

### Requirement: Host commands SHALL enforce builtin protection independently of UI
Commands that save, import, remove, deprecate, or promote controlled vocabulary entries MUST apply builtin policy even when invoked without Workbench controls.

#### Scenario: Direct command attempts builtin deletion or identity change
- **WHEN** a caller bypasses UI and submits a builtin deletion, rename, facet change, or deprecation
- **THEN** the command SHALL reject or normalize the operation
- **AND** the builtin SHALL remain canonical in persistence

#### Scenario: Import preview omits builtin definitions
- **WHEN** an imported vocabulary omits one or more builtin definitions
- **THEN** preview SHALL distinguish retained builtin definitions from ordinary entries
- **AND** applying the import SHALL not remove them

### Requirement: Staged Tag entry points SHALL share one legacy-binding migration gate

List, stage, update, promote, discard, and clear SHALL all pass through one mutually exclusive application migration gate. The gate SHALL preserve stable refs, classify positive numeric legacy IDs separately from invalid bindings, resolve sorted unique IDs through `effects.staged_tag_binding.resolve` in batches of at most one hundred, and reject new numeric bindings at the public DTO boundary.

#### Scenario: Mixed historical bindings are migrated
- **WHEN** staged rows contain stable refs, valid legacy IDs, missing IDs, and invalid bindings
- **THEN** resolved refs are merged and sorted while missing or invalid bindings are removed without deleting the staged suggestion
- **AND** all affected rows are rewritten by one staged-revision CAS

#### Scenario: Host response is incomplete or invalid
- **WHEN** resolved and missing IDs are not a complete duplicate-free partition of the requested batch, or a resolved ref belongs to another library
- **THEN** migration fails with a stable unavailable outcome
- **AND** staged JSON and revision remain byte-for-byte unchanged

#### Scenario: Concurrent staged entry points arrive
- **WHEN** multiple staged operations encounter unmigrated rows concurrently
- **THEN** one migration attempt runs and the callers observe the same committed result
- **AND** a failed attempt is not cached and may be retried by a later entry

### Requirement: Startup SHALL attempt staged binding migration without blocking readiness

Sidecar startup SHALL perform one best-effort migration attempt and record the fixed `staged-tag-binding-migration` operation with running and completed or failed state plus processed and discarded counts. Failure SHALL not prevent readiness, but staged entry points SHALL return stable unavailable until a later gate attempt succeeds.

#### Scenario: Startup migration fails
- **WHEN** Host resolution or atomic rewrite fails during startup
- **THEN** the sidecar becomes ready and the migration operation records failure
- **AND** the original staged rows remain unchanged for a later retry

### Requirement: Tag audit SHALL be callback-scoped and atomically promoted
`synthesis.tags.withAuditRun` SHALL create one internal audit run, provide a bounded append writer to the trusted callback, accept only completed library traversal evidence for promotion, and return only the typed `published`, `canceled`, `resource_limited`, or `conflicted` normal outcomes. Unexpected callback, repository, or native failures SHALL abort and clean staging before throwing a stable error. Begin, append, finalize, abort, lease, fencing, and cleanup SHALL remain internal.

#### Scenario: Complete empty audit is promoted
- **WHEN** a library traversal completes with canonical empty coverage and the callback appends no rows
- **THEN** the audit owner atomically promotes an empty active ledger and returns `published` evidence

#### Scenario: Traversal is resource limited
- **WHEN** the callback returns a resource-limited traversal result
- **THEN** the run does not promote staging and the prior active ledger remains current

### Requirement: Concurrent audit runs SHALL be isolated
Each audit run SHALL have opaque identity, isolated staging, and one promotion attempt. A stale, foreign, or concurrently superseded run MUST NOT alter the active ledger.

#### Scenario: Two runs race to promote
- **WHEN** one run promotes after another run captured an older basis
- **THEN** the older run fails with conflict and its staging is cleaned without replacing the active ledger

### Requirement: Audit append SHALL carry independently verifiable tag evidence
Each audit append row SHALL use the canonical Synthesis item ref and SHALL carry transient complete audited tags together with the Host-owned audited tag digest. The native application SHALL validate canonical tags, digest, and non-compliant-tag subset before persisting only the minimal staging evidence.

#### Scenario: Audit evaluation names a tag outside the audited set
- **WHEN** an append row lists a non-compliant tag that is absent from its transient audited tags
- **THEN** the entire append batch is rejected and no partial staging row is written

### Requirement: Regulation acknowledgement SHALL require confirmed mutation evidence
`synthesis.tags.acknowledgeRegulation` SHALL accept a target and current-process confirmed Host mutation receipt. Host composition SHALL pin and verify the raw receipt, native prepare SHALL bind the current active snapshot, Host SHALL fresh-read current revision and complete tags, and native commit SHALL compare-and-set the bound snapshot, audited revision, and vocabulary. Raw clear requests, old-process receipts, failed attempts, mismatched revisions, or a newer audit snapshot SHALL leave the active row unchanged.

#### Scenario: Confirmed unchanged receipt is acknowledged
- **WHEN** fresh Host validation proves the target tags already satisfy policy and issues a matching `unchanged` receipt
- **THEN** acknowledgement may clear the active regulation requirement atomically

#### Scenario: Receipt comes from a previous Host process
- **WHEN** acknowledgement presents a receipt whose process-scoped verification record is unavailable
- **THEN** acknowledgement fails and the active audit row remains

#### Scenario: A newer audit snapshot wins during acknowledgement
- **WHEN** native prepare binds one snapshot and a newer full audit publishes before commit
- **THEN** acknowledgement returns `stale` with reason `audit_snapshot_changed` and does not delete the newer row

### Requirement: Canonical tag vocabulary SHALL be unique ignoring case

Every canonical vocabulary write SHALL reject a candidate containing tag spellings that differ only by case before persistence commits.

#### Scenario: Canonical write contains case variants
- **WHEN** a candidate contains two canonical tags with the same case-insensitive value
- **THEN** the write SHALL fail as invalid
- **AND** the previously readable aggregate SHALL remain unchanged

### Requirement: Startup SHALL repair historical canonical case collisions

Sidecar startup SHALL make one best-effort attempt to repair historical case-insensitive canonical collisions atomically before readiness. Repair failure SHALL be recorded and SHALL NOT block readiness.

#### Scenario: Historical canonical group has case variants
- **WHEN** startup finds multiple canonical entries with the same case-insensitive tag
- **THEN** a builtin entry SHALL win over a non-builtin entry, then a non-deprecated entry SHALL win, followed by earliest creation time, earliest update time, and exact tag lexical order
- **AND** the winner SHALL retain its descriptive fields while aliases, abbreviations, usage, and parent references are merged without referring to removed spellings
- **AND** only affected pending Host effects SHALL be replaced with one effect per winning tag and unique parent
- **AND** terminal Host effect receipts SHALL remain unchanged
- **AND** the repaired aggregate SHALL remain readable after restart

#### Scenario: Repair commits
- **WHEN** historical collisions are repaired successfully
- **THEN** candidate state, redirected references, affected pending effects, vocabulary identity, projection staleness, and the completed fixed repair operation SHALL commit atomically
- **AND** a later startup SHALL make no repair write when no collisions remain

#### Scenario: Repair transaction fails
- **WHEN** any repair mutation fails before commit
- **THEN** candidate state and Host effects SHALL remain unchanged
- **AND** startup SHALL continue to readiness after recording a failed repair operation when possible
- **AND** a later startup SHALL be able to retry the repair

### Requirement: Candidate tag workflow members SHALL use grouped current names
The candidate v12 projection SHALL expose `loadVocabulary`, `saveVocabulary`, `exportVocabularyForRegulator`, `listStagedSuggestions`, `stageSuggestions`, `promoteStagedSuggestions`, `discardStagedSuggestions`, `withAuditRun`, and `acknowledgeRegulation` under `synthesis.tags`. Flat replacement and clear operations SHALL remain outside the candidate. The active v11 adapter SHALL delegate equivalent methods to the grouped implementation; legacy replacement and clear SHALL remain narrow invocation-late passthroughs until atomic activation supplies their evidence-bearing replacements and removes flat names.

#### Scenario: Candidate projection is inspected
- **WHEN** recursive conformance examines the candidate tag group
- **THEN** it finds the nine grouped members and no flat replacement or clear operation
