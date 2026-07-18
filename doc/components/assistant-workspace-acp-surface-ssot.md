# Assistant Workspace ACP Surface SSOT

This document is the single source of truth for the Assistant Workspace runtime
surface shared by ACP Chat and ACP Skills. It defines the boundary between their
different domain models and the common Host, publication, browser-state, and
rendering system.

The shared surface does not make a Chat conversation a Skills run. It gives
both domains the same presentation contract.

## Architecture Boundary

```text
ACP Chat conversation domain ─┐
                              ├─ ACP surface adapter
ACP Skills run domain ────────┘
                                   │
                                   ▼
                    owner-scoped surface runtime
                                   │
                                   ▼
                publication coordinator and Shell delivery
                                   │
                                   ▼
                     shared browser surface controller
                                   │
                                   ▼
             canonical regions and transcript transaction
                                   │
                                   ▼
                       targeted renderer and ACK
```

Chat continues to own backend authentication, conversations, reconnect,
prompt/cancel, permissions, transcript persistence, and remote-session restore.
Skills continues to own requests, workflow lifecycle, repair, output, apply,
retention, and run persistence. Neither domain store owns Workspace publication
revision, delivery, child loading, rebase, or DOM state.

## Canonical Surface Model

The browser controller owns one source-neutral state:

```text
source
navigation
services
selection.owner
selection.phase
selection.control
selection.messageCounts
selection.transcript
selection.plan
selection.permission
selection.composer
selection.presentation
```

The same field names and null semantics apply to Chat and Skills. A shared
controller or receiver must not project a publication back into Chat top-level
mode/model fields, Skills selected-run fields, or any other source-specific
panel snapshot schema. Source bindings may provide labels, capabilities,
containers, owner payloads, item payloads, and actions; they do not own region
lifecycle.

The Shell sends one adjacent, source-neutral surface bootstrap containing
localized labels and the current execution-display/pagination configuration.
Bootstrap data is presentation environment, not publication state: it has no
owner, region revision, transcript revision, or delivery continuity. Both
children pass canonical state plus that bootstrap to the same shared panel
presentation builder. Child scripts do not independently translate canonical
regions into Chat or Skills panel DTOs.

Owner navigation contains owner entries and current selection. It is distinct
from baseline status. Conversation/run creation, selection, rename, archive,
and availability changes update owner navigation without masquerading as a
lifecycle status or forcing transcript rendering.

## Field Semantics

Workspace fields describe the display projection, not raw storage:

- `totalVisibleItemCount` is the number of items in the complete UI-visible
  transcript universe after applying the selected execution display mode. It is
  neither the raw persisted count nor the number of items loaded in one page.
- `sourceEventSeq` is the monotonic source transcript event position. It may
  advance for events held or hidden by the display projection.
- `transcriptRevision` advances only when the UI-visible transcript changes and
  is the continuity base for transcript delta application.
- `regionRevision` orders publications for one owner and publication kind.
- `deliverySequence` orders Shell delivery to one child document generation.

Snapshot and delta metadata use these meanings identically. Raw Chat
`transcriptItemCount`, raw Skills `itemCount`, persistence revisions, and
source-private identifiers must be normalized at the adapter boundary.

The internal publication protocol is current-state only. Host, Shell, both ACP
children, profiler, and Replay migrate together; old field aliases, decoders,
and dual writes are prohibited.

The wire schema is strict v1. `ASSISTANT_WORKSPACE_REGION_REGISTRY` owns region
shape and source support,
`ASSISTANT_WORKSPACE_PRESENTATION_FIELD_REGISTRY` /
`ASSISTANT_WORKSPACE_DETAILS_SECTION_REGISTRY` own semantic presentation and
lazy details,
and `ASSISTANT_WORKSPACE_ACTION_REGISTRY` owns action scope and exact payload
keys. Presentation usage is numeric gauge data; service LEDs come only from
`service-status`; workspace, recovery, connection, and session metadata use
semantic presentation or lazy detail fields rather than generic indicators.

Connection presentation distinguishes a live transport from a restorable
remote identity. A persisted Chat remote-session id or Skills run session id
keeps the owner and reconnect action available, but it does not make the
connection LED green, enable Disconnect, or enable runtime selectors. Connect,
Disconnect, Authenticate, Chat auto-approval, and Skills Cancel remain resident
in their source-specific banner; capability is expressed by disabled state.
Service and connection LEDs render their localized label and tone without
appending raw runtime values such as `idle`, `running`, or `waiting_user`.

`owner-control.hint` is the semantic source for the managed interaction hint.
It carries a bounded kind plus optional user-facing detail; raw workflow or
backend status strings do not cross into the visible hint. The composer reply
region owns enablement only and does not duplicate hint text in its footer.
Owner presentation contains only stable banner metadata: Chat backend,
workspace, and a real live session title/id when present; Skills backend and
workspace. Runtime option groups carry their own enabled state, and a disabled
Chat reasoning selector renders the localized Default option.

## Adapter Contract

Each domain registers one `AssistantWorkspacePublicationAdapter`. The adapter is
limited to:

- O(1) lookup of the active owner;
- exhaustive mapping from source runtime changes to canonical domain changes;
- owner-scoped reads for one named region or transcript page;
- display projection of source items into canonical transcript items and
  mutations;
- dispatch of source actions after the shared runtime validates owner and
  action scope.

Every canonical publication kind must have a Chat and Skills mapping or an
explicit `not-applicable` declaration. Unknown source changes do not fall back
to baseline status, a complete panel snapshot, or a frontend snapshot.

The adapter must not schedule publications, maintain publication revisions,
hold child readiness, or initiate rebase.

Action dispatch has five scopes: local, target-owner, selected-owner,
navigation-group, and global. Drawer and selector item actions use the clicked
canonical owner. Owner identity never appears again in the action payload.

## Host Runtime and Ordering

One shared ACP surface runtime owns:

- active-source and active-owner guards;
- owner-scoped region scheduling and stable region signatures;
- the ordered transcript lane;
- child document generation and retained delivery;
- lane cleanup on owner switch, archive, child replacement, and unload;
- automatic rebase and its page read;
- lifecycle diagnostics and exact publication barriers.

Initialization is an ordered set of typed region publications. It publishes
navigation and service status, then the new owner and transcript loading state,
then the indexed ready page, and finally one batch read of the remaining
owner-scoped regions. It does not build a complete Chat or
Skills panel snapshot. Indexed page readiness and full mirror hydration remain
independent.

Only accepted render completion or a terminal rejection advances an in-flight
transcript publication. Shell receipt and forwarding are observational. A new
child document generation receives retained publications or a current
activation sequence and never inherits revision state from the replaced
document.

Target deactivation is a terminal publication-runtime boundary. It marks every
still-pending lifecycle as `superseded` and clears queued work, owner lanes,
transcript projection, and region signatures, so a later Replay barrier cannot
inherit an identity that can no longer reach the Shell. If the same child
document is merely hidden and reopened, `regionRevision` and
`deliverySequence` remain monotonic; only in-flight ownership is reset.

## Transcript Transaction

The browser controller holds one committed transcript transaction containing:

- owner and page identity;
- page metadata;
- ordered item identities;
- item lookup;
- transcript revision;
- canonical transcript region.

Delta handling follows `plan → render → commit`:

1. Validate the complete publication, continuity metadata, and mutation batch
   against committed state without mutating it.
2. Build a bounded effect for `upsert_item`, `append_text`, `patch_item`, or
   `delete_item`.
3. Stage virtual page state and node-map changes, then apply only affected row
   or text-node changes.
4. Commit page metadata, item order, lookup, region state, revision, and
   accepted acknowledgement together.

An item introduced by one accepted delta must be immediately addressable by the
next delta. Validation or rendering failure leaves committed state and
unrelated DOM unchanged. The renderer returns a bounded failure stage/code and
render path. The child restores the last committed snapshot before rejecting
the publication, so an equivalent later publication remains retryable.

A selected tail page remains bounded by its declared limit. Historical pages
receive off-page metadata changes without inserting tail rows or forcing
navigation.

## Rebase Ownership

The coordinator is the only automatic-rebase initiator.

- Child gap or render failure emits one terminal rejection ACK.
- Buffer overflow marks the owner lane for rebase without posting residual
  mutations.
- The Host reads the current page once through the source adapter and queues one
  snapshot with rebase cause in the same owner lane.
- Child page requests are reserved for explicit user navigation.

There is no resync control publication and no child request/coordinator request
loop. Rebase state is idempotent per owner, page, and rejected revision.

## Rendering Invariants

Transcript and prompting are independent of toolbar, banner, plan, hint, reply,
context details, and permission regions.

- Transcript-only changes render only the transcript region.
- Message-count-only changes render only message counts.
- Every non-transcript managed region uses a signature containing only its
  visible content and open/collapsed state.
- Streaming append preserves its target row and text-node identity.
- Finalization or structural change redraws only affected presentation rows.
- Steady delta never falls back to a complete transcript or panel render.
- Loading for one owner cannot clear another owner's transcript window.

Snapshot/full transcript rendering is restricted to initialization, activation,
explicit page navigation, rebase, display-mode change, or an explicit virtual
window reset.

## Surface Parity and Allowed Differences

Chat and Skills share publication forms, region names, count meanings,
continuity, scheduling, rebase, child state, renderer effects, and ACK outcomes.
Equivalent normalized event sequences must therefore make the same publication
and rebase decisions.

Allowed differences are domain data and actions: Chat backend/conversation
metadata and connection controls; Skills workflow/run/output metadata and run
controls. These differences stay inside owner payloads, typed region payloads,
capabilities, and source action adapters.

Skills is a behavioral reference for owner-scoped reads and low target-active
overhead, not an implementation template. Missing Skills progress publication
is a parity defect, not an optimization.

## Evidence and Acceptance

The parameterized production conformance suite is the primary drift guard. It
covers owner matching, initialization, transcript and count changes, boundary
holding/release, cross-delta item continuity, owner/page changes, stale/gap
outcomes, single rebase, acknowledgement identity, and forbidden
materialization for both adapters.

Formal Replay uses the same trace digest, cadence, and user-selected display
mode for before/after evidence. Logical cadence proves counts, bytes, forms,
identity, and structural paths only. Recorded cadence on an available Zotero 7
or Zotero 9 host is required for target-active overhead and drift claims.

Before each profile window, Replay drains both ACP lifecycle lanes and captures
per-source delivery watermarks. The forced target barrier is created only after
the active source's prior epoch is terminal. ACKs for pre-window identities are
retained as bounded out-of-window diagnostics and make measurement incomplete
if they arrive during the profile.

The Workspace surface is not accepted while either Chat or Skills has an
invisible transcript, incomplete publication lifecycle, valid-stream gap or
rebase snapshot, `recovery-full` render path, forbidden steady materialization,
posted-byte regression, or greater-than-100-millisecond drift regression.
