# assistant-workspace-publication-data-plane Specification

## Purpose
Defines the shared v3 publication vocabulary, transcript region model, mutation buffer, and page request protocol used by both ACP Chat and ACP Skills surfaces in Assistant Workspace.
## Requirements
### Requirement: Workspace publication uses one v3 vocabulary

ACP Chat and ACP Skills SHALL use the same v3 owner, transcript region, page, item, mutation, publication, and acknowledgement field names and semantics. Workspace production code SHALL NOT contain `selectedTranscript`, `selectedTranscriptPage`, or `transcriptState`, and SHALL NOT decode, alias, or dual-write older publication fields.

#### Scenario: Either surface initializes transcript

- **WHEN** ACP Chat or ACP Skills publishes its owner-first transcript initialization
- **THEN** both produce the same `AssistantWorkspaceTranscriptRegion` shape and status invariants
- **AND** neither surface emits a surface-specific transcript lifecycle field.

### Requirement: Publication identity fields are unambiguous

The v3 publication envelope SHALL use `publicationId`, `owner`, `publicationKind`, `publicationForm`, `publicationCause`, `regionRevision`, and `deliverySequence`. Owner source SHALL exist only in the owner envelope; signature SHALL remain coordinator-internal; acknowledgement SHALL identify a publication only by `publicationId` plus stage, outcome, and reason.

#### Scenario: Shell acknowledges a publication

- **WHEN** Shell receives and forwards a v3 publication
- **THEN** its acknowledgement does not duplicate owner, kind, revision, signature, source, tab, or initialization fields.

### Requirement: Transcript fields have one scope

Transcript page SHALL use stable `pageKey`, `startCursor`, `limit`, `totalItemCount`, nullable adjacent cursors, `eventSeq`, and shared items. Shared items SHALL use `itemId` and `itemKind`. Page SHALL NOT carry requestId or other owner identity, and Workspace SHALL distinguish `eventSeq`, `regionRevision`, `uiRevision`, and `deliverySequence` by their declared scopes.

#### Scenario: Chat and Skills select equivalent tail pages

- **WHEN** both adapters normalize an equivalent tail page
- **THEN** the normalized page fields and null semantics are identical apart from owner and item payload content.

### Requirement: Steady transcript mutation is producer-native

Chat and Skills SHALL project UI-visible mutations at their store event seams and SHALL pass them through the same transcript projection. Steady transcript publication SHALL NOT read, clone, index, stringify-compare, or diff a complete transcript page.

#### Scenario: Text grows on an existing item

- **WHEN** equal-sized text chunks append to an increasingly long item
- **THEN** each steady publication carries only the new suffix mutation
- **AND** publication cost does not include accumulated text.

### Requirement: Publication state machine is shared and closed

The coordinator SHALL maintain one in-flight transcript publication per owner/page, including initialization snapshots. Shell receipt and forwarding SHALL be observational; only render completion or a terminal rejection SHALL advance the queue. Shell SHALL replay the current typed in-flight publication after child readiness or frame reload.

#### Scenario: Child listener starts after initial snapshot post

- **WHEN** the initial snapshot reaches Shell before the child listener is ready
- **THEN** Shell retains and forwards it after readiness
- **AND** no later delta overtakes it.

### Requirement: Queue overflow and gaps force rebase

The shared mutation buffer SHALL merge consecutive same-item appends and SHALL be limited to 512 mutations or 256 KiB. Overflow or child gap SHALL stop continuous delta publication and SHALL require a forced snapshot rebase.

#### Scenario: Mutation buffer overflows

- **WHEN** either surface exceeds a buffer limit
- **THEN** it publishes resync-required and does not publish residual mutations as continuous delta.

### Requirement: Domain mappings are exhaustive for both surfaces

Every publication kind SHALL have a compile-time Chat and Skills mapping or explicit `not-applicable` declaration. Unknown runtime changes SHALL NOT fall back to baseline or full snapshot.

#### Scenario: A new domain kind is introduced

- **WHEN** one surface mapping is missing
- **THEN** type checking or conformance validation fails before publication.

### Requirement: Transcript page requests are shared

Both child panels SHALL send one owner-plus-page-request action shape, and Host SHALL dispatch only by owner source. Child and shared receiver SHALL NOT construct surface-specific page or resync request schemas.

#### Scenario: Child requests rebase

- **WHEN** either surface detects a transcript gap
- **THEN** it sends the same request shape with the complete owner envelope and page request.

### Requirement: Transcript mutations have minimal canonical semantics

ACP Chat and ACP Skills SHALL use one before/after projection for visible transcript items. Pure suffix growth SHALL emit `append_text`, stable-item field changes SHALL emit a minimal `patch_item`, new or identity-replacing items SHALL emit `upsert_item`, and removed items SHALL emit `delete_item`. Steady projection SHALL NOT replace a patch with a complete item or inspect a complete page.

#### Scenario: Stable item metadata changes

- **WHEN** either surface changes one visible field on an existing item without changing its identity
- **THEN** it publishes one `patch_item` containing only the changed normalized field
- **AND** Chat and Skills use the same field null and omission semantics.

#### Scenario: Long text receives a suffix

- **WHEN** an existing text segment receives another chunk
- **THEN** the publication contains only the new suffix
- **AND** projection cost is independent of accumulated text and page size.

### Requirement: Transcript owner delivery is totally ordered

The coordinator SHALL place loading, ready page, delta, resync-required, page transition, and rebase publications for one owner in one ordered lane. A later publication SHALL NOT overtake an earlier publication across page keys, and only accepted render completion or a terminal rejection SHALL advance the lane.

#### Scenario: Indexed page becomes ready during owner initialization

- **WHEN** the page read finishes before the loading snapshot receives terminal acknowledgement
- **THEN** the ready snapshot remains queued behind loading
- **AND** no delta can validate against an uncommitted owner.

### Requirement: Typed delivery survives child document readiness

Shell SHALL retain typed publications by tab and delivery sequence until a terminal child acknowledgement. Child readiness SHALL identify a document generation; Shell SHALL replay retained publications to a newly ready generation, and the shared receiver SHALL return an idempotent terminal result for duplicate publication identity.

#### Scenario: Child listener starts late

- **WHEN** Shell receives a transcript page publication before the child document declares ready
- **THEN** Shell retains and forwards it after readiness
- **AND** the transcript becomes visible without another runtime change or user tab switch.

#### Scenario: Child document is replaced

- **WHEN** an iframe receives a new document generation
- **THEN** Host publishes the current activation/page snapshot for that generation
- **AND** the replacement document does not depend on revision state from the old document.

### Requirement: Render acknowledgement represents completed DOM work

Child apply SHALL commit the validated model before acknowledgement, and accepted render completion SHALL be emitted only after the requested transcript DOM effect succeeds. Renderer failure SHALL produce terminal `render-failed` and SHALL NOT be reported as accepted.

#### Scenario: Target row rendering throws

- **WHEN** the shared renderer cannot apply a transcript effect
- **THEN** the publication receives terminal `render-failed`
- **AND** the coordinator does not treat it as accepted render completion.

### Requirement: Transcript item and presentation row identities are distinct

Workspace page and mutation payloads SHALL use `itemId` as the only transcript item identity. A child presentation row that combines or transforms items SHALL use a separately named `rowKey` and SHALL declare the itemIds it represents; it SHALL NOT expose a derived row key as an itemId or translate itemId into a second item identity.

#### Scenario: Tool item is grouped for bubble presentation

- **WHEN** a shared tool-call item participates in a bubble tool group
- **THEN** receiver continuity and mutation lookup continue to use its original itemId
- **AND** the group uses a presentation-only rowKey with the represented itemIds.

### Requirement: Selected tail page remains bounded during delta application

The shared coordinator and receiver SHALL keep a stable tail page bounded by its declared limit. Its startCursor SHALL advance from totalItemCount, and newly visible tail items SHALL evict the same number of items from the page head. A historical page SHALL receive only metadata for off-page tail changes.

#### Scenario: Full tail page receives a new item

- **GIVEN** a selected tail page contains its limit of 80 items
- **WHEN** one new item is appended and totalItemCount advances by one
- **THEN** the selected page contains exactly 80 items
- **AND** startCursor advances by one without changing pageKey.

#### Scenario: Delete requires an unloaded replacement

- **WHEN** a deletion would require an item outside the loaded page to preserve a complete selected window
- **THEN** the receiver requests rebase
- **AND** it does not commit a guessed or incomplete page.

### Requirement: Transcript delta application is atomic and structurally incremental

The shared receiver SHALL validate a complete mutation batch before committing model or revision changes. The shared renderer SHALL implement upsert, append, patch and delete by reconciling only affected presentation rows. A steady delta SHALL NOT fall back to initialization or full-page rendering.

#### Scenario: Hard boundary releases text and adds a tool row

- **WHEN** a delta contains held text append, text finalization and a new tool upsert
- **THEN** the batch commits atomically
- **AND** only rows affected by those mutations are inserted or updated
- **AND** unrelated row nodes retain identity.

#### Scenario: Incremental render cannot establish a valid row projection

- **WHEN** the receiver or renderer cannot apply a steady delta consistently
- **THEN** model, revision and DOM remain unchanged
- **AND** the publication terminates as render-failed and requests rebase instead of performing a full render.
