# assistant-workspace-publication-data-plane Specification

## Purpose
Defines the shared v1 publication vocabulary, canonical browser state, semantic
presentation and action registries, transcript region model, mutation buffer,
and page request protocol used by ACP Chat, ACP Skills, and SkillRunner
surfaces in Assistant Workspace.
## Requirements
### Requirement: Workspace publication uses one strict v1 registry

ACP Chat, ACP Skills, and SkillRunner SHALL use the v1 region and
presentation registries as the sole source of publication kind, payload,
semantic presentation fields, browser key, managed region, and source
support. Non-v1 publications, generic banner arrays, producer labels,
presentation tasks, aliases, and dual writes SHALL be rejected.

#### Scenario: A non-v1 presentation reaches the child

- **WHEN** a publication uses a non-v1 schema or a removed presentation field
- **THEN** the receiver rejects it as invalid
- **AND** canonical state and DOM remain unchanged.

### Requirement: Publication identity fields are unambiguous

The v1 publication envelope SHALL use `publicationId`, `owner`, `publicationKind`, `publicationForm`, `publicationCause`, `regionRevision`, and `deliverySequence`. Owner source SHALL exist only in the owner envelope; signature SHALL remain coordinator-internal; acknowledgement SHALL identify a publication only by `publicationId` plus stage, outcome, reason, and an optional bounded renderer failure stage/code.

#### Scenario: Shell acknowledges a publication

- **WHEN** Shell receives and forwards a v1 publication
- **THEN** its acknowledgement does not duplicate owner, kind, revision, signature, source, tab, or initialization fields.

### Requirement: ACP action scope is exact

Every shared ACP action SHALL be classified as local, target-owner,
selected-owner, navigation-group, or global. Target identity SHALL be present
only in the action owner envelope.

#### Scenario: A user selects another task

- **WHEN** a drawer card for a non-selected Skills owner is activated
- **THEN** the clicked owner is sent in the action envelope
- **AND** the current selected owner does not replace it.

### Requirement: Owner selection replaces the complete owned state

The canonical child state SHALL contain one `selection` object for the selected
owner. Applying owner navigation with a different owner SHALL atomically replace
that selection with the new owner's empty loading state.

#### Scenario: Skills switches runs

- **WHEN** owner navigation selects another request
- **THEN** no control, count, transcript, plan, permission, composer, or
  presentation field from the previous request remains visible.

### Requirement: Publication identity is not duplicated

The publication wrapper SHALL NOT duplicate source tab identity, transcript page
requests SHALL contain only owner plus page request, and Replay barriers SHALL
contain only source, publication id, and delivery sequence.

#### Scenario: Chat requests a historical page

- **WHEN** the child requests a cursor
- **THEN** backend and conversation identity exist only in the canonical owner
- **AND** no request-id or active-conversation alias is accepted.

### Requirement: Transcript fields have one scope

Transcript page SHALL use stable `pageKey`, `startCursor`, `limit`, `totalVisibleItemCount`, nullable adjacent cursors, `sourceEventSeq`, and shared items. Transcript continuity SHALL use `transcriptRevision`; publication-kind order SHALL use `regionRevision`; Shell delivery SHALL use `deliverySequence`. Raw store item counts SHALL NOT cross a surface adapter.

#### Scenario: Snapshot and delta describe the same visible universe

- **WHEN** an owner publishes a ready snapshot followed by a visible delta
- **THEN** both forms define `totalVisibleItemCount` after the same display projection
- **AND** held text or hidden source events do not create a count mismatch.

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

### Requirement: Queue overflow and gaps force coordinator-owned rebase

The shared mutation buffer SHALL merge consecutive same-item appends and SHALL be limited to 512 mutations or 256 KiB. Overflow, child gap, or render failure SHALL stop delta publication and schedule exactly one current-page snapshot rebase through the shared host runtime. Child SHALL NOT request an automatic rebase page.

#### Scenario: Mutation buffer overflows

- **WHEN** either surface exceeds a buffer limit
- **THEN** the coordinator schedules one rebase snapshot in the owner lane
- **AND** no residual mutation or control publication is delivered as continuous delta.

#### Scenario: Child reports a gap

- **WHEN** the shared child controller rejects a transcript publication as a gap
- **THEN** it sends one terminal rejection acknowledgement
- **AND** the host reads and publishes the current page once.

### Requirement: Domain mappings are exhaustive for every registered source

Every publication kind SHALL have a compile-time mapping or an explicit
`not-applicable` declaration for each registered source (ACP Chat, ACP
Skills, SkillRunner). Unknown runtime changes SHALL NOT fall back to a
baseline or a full snapshot.

#### Scenario: A new domain kind is introduced

- **WHEN** one surface mapping is missing
- **THEN** type checking or conformance validation fails before publication.

### Requirement: Transcript page requests are shared

Both child panels SHALL send one owner-plus-page-request action shape for explicit user navigation, and Host SHALL dispatch only by owner source. Automatic rebase SHALL be coordinator-owned and SHALL NOT use the child page-request action.

#### Scenario: User opens a historical page

- **WHEN** either surface requests a transcript cursor through the UI
- **THEN** it sends the same owner-plus-page-request shape
- **AND** Host publishes the selected page in that owner's ordered lane.

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

The coordinator SHALL place loading, ready page, delta, page transition, and rebase publications for one owner in one ordered lane. Overflow and gap SHALL request a rebase without introducing another wire publication kind. A later publication SHALL NOT overtake an earlier publication across page keys, and only accepted render completion or a terminal rejection SHALL advance the lane.

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

### Requirement: Transcript delta application is transactional

The shared browser controller and transcript renderer SHALL validate a complete
mutation batch before rendering and SHALL commit page metadata, item map, item
order, transcript revision, canonical region state, virtual page state, node
maps, signatures, DOM, and acknowledgement only after the complete bounded DOM
effect succeeds. A steady delta SHALL NOT fall back to initialization or
full-page rendering.

#### Scenario: A later delta edits a newly inserted item

- **WHEN** one accepted delta upserts an item and the next delta appends or patches that item
- **THEN** the second delta resolves the item from the committed index and is accepted
- **AND** no gap or rebase is produced.

#### Scenario: A batch or render effect fails

- **WHEN** validation or targeted rendering cannot complete
- **THEN** committed model, revision, and unrelated DOM remain unchanged
- **AND** one terminal rejection enters coordinator-owned rebase.

#### Scenario: A structural delta render fails

- **WHEN** row reconciliation cannot complete
- **THEN** no partial renderer state becomes committed
- **AND** the same signature can be retried from the previous committed state.

### Requirement: ACP child state is source-neutral

ACP Chat and ACP Skills SHALL use one canonical child state containing `source`, `navigation`, `services`, and `selection`. Selection SHALL contain only `owner`, `phase`, `control`, `messageCounts`, `transcript`, `plan`, `permission`, `composer`, `presentation`, and `details`. Shared receiver/controller code SHALL NOT write source-specific panel snapshot fields.

#### Scenario: Equivalent publications reach both children

- **WHEN** equivalent normalized publications are delivered to Chat and Skills
- **THEN** they update the same canonical region field
- **AND** only labels, capabilities, owner payloads, and item content may differ.

### Requirement: Owner control separates semantic hint from composer state

`owner-control` SHALL publish a bounded semantic hint kind plus optional
user-facing detail. Raw workflow status, backend status, connection state, and
stop reason SHALL NOT be used directly as visible hint text. `composer.reply`
SHALL contain only reply enablement state and SHALL NOT duplicate the managed
hint in the composer footer.

#### Scenario: A Skills run waits for user input

- **WHEN** the run status is `waiting_user`
- **THEN** the owner-control hint publishes the semantic `waiting_user` kind
- **AND** the shared renderer localizes the waiting prompt
- **AND** composer reply state independently determines whether input is enabled.

### Requirement: Owner details are lazy and owner guarded

The v1 registry SHALL define an `owner-details` publication and exact request
action for both ACP sources. Details SHALL use bounded read-only sections and
actions, SHALL NOT contain transcript pages, event histories, or complete
session/run snapshots, and SHALL be committed only when their owner equals the
current canonical owner.

#### Scenario: A late details response follows an owner switch

- **WHEN** owner A requests details and the user selects owner B before the read completes
- **THEN** owner B is rendered loading-first and owner A details are discarded
- **AND** the details drawer does not display stale owner A content.

### Requirement: Permission publication is structured

The v1 permission DTO SHALL use `approvalKind` equal to `acp-tool` or
`zotero-write`, bounded tool metadata, structured command/preview review, and
backend-provided options. Permission actions SHALL carry only request ID,
outcome, and optional option ID while owner identity remains solely in the
action envelope.

#### Scenario: A permission action is routed

- **WHEN** the user selects an approval option or Cancel
- **THEN** the Host receives the canonical owner envelope and exact permission action fields
- **AND** legacy source strings, raw JSON, and duplicate owner fields are rejected.

### Requirement: Restorable identity is not a live connection

Connection `connected` SHALL describe the current live transport. A persisted
remote Chat session id or Skills session id SHALL only describe session
availability and SHALL NOT enable Disconnect or runtime option controls.

#### Scenario: A Chat conversation is disconnected but restorable

- **GIVEN** the owner retains a remote session id without a live adapter
- **WHEN** owner-control and composer regions are projected
- **THEN** Connect is enabled and Disconnect is disabled
- **AND** mode, model, and reasoning controls are disabled.

### Requirement: Automatic rebase has no wire control form

Transcript publication form SHALL be `snapshot` or `delta`. Gap and overflow SHALL be host lifecycle decisions rather than another wire publication kind.

#### Scenario: Valid delta stream remains steady

- **WHEN** a selected owner receives a valid sequence of transcript mutations
- **THEN** every steady transcript publication is a delta
- **AND** no automatic-rebase control form or snapshot is posted.

### Requirement: Wire field registries are exposed by both peers

The v1 publication wire field lists SHALL be defined once per peer as
importable constants: exported from the host publication module and exposed
by the ACP child as
`window.AssistantWorkspaceAcpChild.wireFieldRegistry`. The lists SHALL cover
envelope keys, per-kind region payload keys, transcript snapshot and delta
keys, permission request keys, and forbidden wire fields. Both peers SHALL
reject host-internal fields using the same 15-entry forbidden set.

#### Scenario: Drift guard compares both registries

- **WHEN** the wire drift guard test runs
- **THEN** it SHALL fail naming the kind and the differing fields whenever the
  host and child registries disagree on any envelope, payload, transcript,
  permission, or forbidden key set.

#### Scenario: Host-internal field reaches the receiver

- **WHEN** a publication payload contains a forbidden wire field such as
  `deliveryRevision`, `initialization`, `totalItemCount`, `eventSeq`,
  `uiRevision`, or `baseUiRevision`
- **THEN** the child receiver SHALL reject the publication as invalid.

### Requirement: Debug builds self-check produced publications

Debug builds SHALL assert every outgoing publication against the strict v1
wire schema at the coordinator's single construction point before it is
posted. The check SHALL be gated by a build-time capability flag and debug
mode so release builds fold it out entirely.

#### Scenario: Malformed publication in a debug build

- **WHEN** a debug build constructs a publication whose payload violates the
  v1 key registry
- **THEN** construction SHALL throw before the publication is posted.

#### Scenario: Release build constructs publications

- **WHEN** a release build constructs any publication
- **THEN** no wire assertion SHALL execute.

### Requirement: Data-plane tests derive fixtures from production constructors

Publication data-plane tests SHALL source payloads from the production region
and transcript constructors rather than hand-written literals. Boundaries
whose production constructor is impractical to seed in Node (service-status,
acp-skills owner-details) MAY keep hand-written fixtures only when a smoke
assertion verifies the production constructor's output passes the v1 wire
assertion.

#### Scenario: Producer adds a payload field

- **WHEN** a production region constructor emits a new payload field
- **THEN** the data-plane fixtures SHALL carry that field without manual
  fixture edits
- **AND** the wire drift guard SHALL fail until the receiver registry is
  updated.

### Requirement: Wire contract has one shared source

The v1 wire contract SHALL have one shared source:
`src/shared/assistantWireContract.ts`, imported by both the host modules and
the page-bundle modules. The v1 wire field lists, message types, bridge keys,
and out-of-band action names SHALL be defined only there. Hand-duplicated
contract literals in page scripts or host modules SHALL be rejected by an
anti-hardcoding test guard. The publication module MAY re-export the shared
constants for compatibility.

#### Scenario: A message type is needed on both sides

- **WHEN** a host module and a page module both reference a wire message
  type, bridge key, or field list
- **THEN** both SHALL import the same constant from the shared contract
- **AND** the anti-hardcoding guard SHALL fail if a literal is reintroduced.

#### Scenario: Dead vocabulary stays removed

- **WHEN** the shell resolves per-tab message types
- **THEN** the removed `acp-skill-run:*` and `acp:*` types SHALL NOT
  reappear
- **AND** drawer closing uses `assistant-workspace:close-drawers` and the
  details drawer action uses `open-details-drawer` on both emitter and
  listeners.

### Requirement: Publication separates transcript content from interaction chrome

Assistant Workspace publication SHALL publish pending messages as transcript content and publish validated prompt, hint, options, file declarations, capability, and limits as interaction state. Child wire and transcript SHALL never contain local source paths or file bytes.

#### Scenario: Waiting snapshot is republished

- **WHEN** transcript revision changes without visible interaction-state changes
- **THEN** the interaction signature SHALL remain stable
- **AND** the interaction managed region SHALL retain DOM identity

### Requirement: Action payloads are typed with registry drift guards

Every action in `ASSISTANT_WORKSPACE_ACTION_REGISTRY` SHALL have a payload
type in `src/shared/assistantActionContract.ts`. Compile-time guards SHALL
fail the type check when the type map's keys differ from the registry's
`payloadKeys` or when the chat/skills action subsets differ from the
registry's `sources`. Runtime registry validation SHALL remain the receiver
gate; the types add compile-time checking without changing runtime behavior.

#### Scenario: A registry action gains a payload key

- **WHEN** a registry entry's `payloadKeys` changes without a matching
  payload type update
- **THEN** `tsc --noEmit` SHALL fail at the drift guard.

### Requirement: Canonical live-tail state is independent from on-demand pages

The publication coordinator SHALL maintain one canonical live-tail mutation base per transcript owner. Explicit page responses SHALL add or update page-scoped cache state without replacing that live-tail base. Loading and empty publications SHALL include canonical owner identity in their semantic signature.

#### Scenario: Historical page response does not replace live-tail mutation state

- **GIVEN** an owner has a canonical live-tail page receiving steady mutations
- **WHEN** an on-demand historical page response is published
- **THEN** the response SHALL update only its page-scoped state
- **AND** subsequent tail mutations SHALL continue from the unchanged canonical live-tail base.

#### Scenario: Out-of-order page responses remain owner scoped

- **WHEN** page requests complete out of order for the same selected owner
- **THEN** each response SHALL populate only its requested page identity
- **AND** neither response SHALL replace another page or the canonical tail base.

#### Scenario: Loading state cannot be reused across owners

- **GIVEN** owner A has rendered a loading or empty transcript state
- **WHEN** selection changes to owner B with the same visible loading semantics
- **THEN** the owner-scoped signature SHALL still commit owner B's state
- **AND** no transcript DOM or canonical state from owner A SHALL be retained.

### Requirement: SkillRunner owner identity is request scoped

The SkillRunner workspace owner SHALL carry `source: "skillrunner"`, an
`ownerKey`, the `requestId`, and the `runKey`. The `ownerKey` SHALL be the
request id when one is assigned and SHALL fall back to the run key for
unassigned local runs. A late request-id assignment SHALL surface as an
owner switch and SHALL follow the owner-first loading sequence.

#### Scenario: A local run receives its request id

- **GIVEN** a SkillRunner run was selected before its request id was assigned
- **WHEN** the backend assigns the request id
- **THEN** the owner key changes to the request id
- **AND** the workspace republishes the new owner with a loading-first transcript snapshot.

### Requirement: SkillRunner transcript publishes as snapshots

The SkillRunner surface SHALL publish transcript updates only as
transcript snapshots, never as incremental mutations, because the
SkillRunner channel has no incremental event stream at this boundary.
Transcript revisions SHALL come from the producer-side boundary signature,
unchanged region payloads SHALL be absorbed by coordinator signature
dedup, and conversation entries SHALL be projected to canonical transcript
items producer-side.

#### Scenario: A streaming SkillRunner run appends chat entries

- **WHEN** new SkillRunner chat entries cross a producer boundary signature
- **THEN** a transcript snapshot with an incremented revision is published
- **AND** non-transcript regions with unchanged payloads are not republished.

### Requirement: ACP transcript mirror storage has one shared implementation

The ACP Chat and ACP Skills transcript mirror layers — cold full-mirror LRU,
live/pinned exemption, scheduled hydrate, page-first indexed reads, mirror
event application, event queueing, and streaming text coalescing — SHALL be
served by one shared parameterized store. Per-source variation (owner key
scheme, pin predicate, item-id allocation, streaming segment tracking, plan
handling mode, continuity bookkeeping, not-hydrated queue branch, emission
and persistence callbacks) SHALL be injected as an owner descriptor
keyed by owner source. The shared store SHALL NOT branch on backend id,
provider id, agent family, command name, or backend product strings, and
both sources SHALL keep consuming the shared session-update boundary
classifier. The SkillRunner bounded in-memory mirror stays out of this
store by design.

#### Scenario: A new mirror concern is added

- **WHEN** mirror eviction, hydrate scheduling, or page-read behavior changes
- **THEN** the change is made once in the shared store
- **AND** both ACP sources inherit it through their owner descriptors
  without per-source copies.

#### Scenario: Coalescing semantics stay protocol-level

- **WHEN** an assistant text chunk arrives around a soft side-channel
  update (`tool_call_update`, usage, status, workspace activity)
- **THEN** the shared store coalesces the text segment identically for
  both ACP sources
- **AND** no backend-specific special case exists in the store.

### Requirement: Host action dispatch uses one table keyed by owner source

Host-side Assistant Workspace action routing SHALL have a single entry
that performs envelope validation, owner parsing, registry route
validation, and the selected-owner guard, followed by one dispatch table
keyed by action and owner source. Handler bodies that are shared across
sources SHALL exist exactly once in the table. The action registry and
the typed action contract SHALL remain the vocabulary and payload SSOT;
the dispatch table SHALL NOT introduce action vocabulary outside the
registry. Routes without known senders that are annotated
`TODO(contract)` SHALL be preserved verbatim.

#### Scenario: A cross-source action is handled

- **WHEN** `resolve-permission`, `copy-diagnostics`, `open-workspace`,
  `set-mode`, `set-model`, `set-reasoning-effort`,
  `cancel-queued-workflow-unit`, `open-backend-manager`, or
  `set-execution-display-mode` arrives from any registered source
- **THEN** one shared handler body executes with the source-resolved
  owner context
- **AND** registry validation and owner guards run exactly once at the
  single entry.

#### Scenario: A parked route is touched

- **WHEN** a `TODO(contract)` route is reached
- **THEN** its existing behavior and marker annotation are unchanged.

