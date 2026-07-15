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
