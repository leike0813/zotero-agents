# assistant-workspace-ui-refresh-governance Specification

## Purpose
Governs how Assistant Workspace panels classify, coalesce, and publish UI refresh events to prevent high-frequency streaming updates from overwhelming the interface while preserving responsiveness for critical states and structural transcript events.
## Requirements
### Requirement: Assistant Workspace UI publish events are governed

Assistant Workspace panels SHALL classify runtime refreshes as `critical`,
`boundary`, `live`, or `background` and SHALL apply the global `live`,
`boundary`, or `silent` execution display mode before publishing.

Scheduling urgency and transcript eligibility SHALL be additive. A critical event SHALL publish immediately, but in live mode it SHALL NOT suppress changed UI-visible transcript content or cancel a queued live transcript without publishing equivalent content. Background events SHALL not publish. In `live`, text/thought live events SHALL publish naturally and metadata live events SHALL use the shared cadence. In `boundary`, live text SHALL remain unpublished until a complete semantic message or other existing boundary. In `silent`, ordinary live and boundary events SHALL not publish transcript content; only a semantic-message count change or critical interaction/terminal state SHALL publish.

#### Scenario: live text advances naturally

- **GIVEN** execution display mode is `live`
- **WHEN** a panel receives text or thought chunks
- **THEN** the UI-visible transcript advances without waiting for metadata cadence.

#### Scenario: critical refresh retains concurrent live transcript

- **GIVEN** execution display mode is `live`
- **AND** a selected owner's UI-visible transcript changed
- **WHEN** a critical lifecycle or metadata refresh publishes before a queued live refresh
- **THEN** the critical snapshot SHALL include the changed transcript
- **AND** the transcript revision SHALL advance exactly once for that published mirror state.

#### Scenario: boundary mode preserves message publication

- **GIVEN** execution display mode is `boundary`
- **WHEN** partial text is followed by a complete semantic message boundary
- **THEN** partial text remains hidden until the boundary
- **AND** the completed message publishes immediately.

#### Scenario: silent chunks publish only first-segment progress

- **GIVEN** execution display mode is `silent`
- **WHEN** many chunks form one assistant semantic message
- **THEN** only the first chunk changes the visible message count
- **AND** later chunks publish no snapshot.

#### Scenario: silent critical state remains immediate

- **GIVEN** execution display mode is `silent`
- **WHEN** a run requires permission, authentication, or user input, or becomes terminal
- **THEN** that critical state publishes immediately.

### Requirement: UI-visible transcript is separate from canonical transcript

Assistant Workspace panels SHALL publish transcript snapshots from a mode-specific UI-visible projection instead of exposing canonical runtime state directly. Metadata updates SHALL NOT expose unpublished text.

In `live` and `boundary`, existing structural transcript behavior SHALL remain. In `silent`, thought, tool, plan, workspace activity, ordinary status, invalid/pending output revision, and non-final assistant content SHALL be absent from the UI-visible transcript. User content, critical interaction state, and final assistant/terminal content SHALL remain eligible.

#### Scenario: metadata does not leak boundary text

- **GIVEN** mode is `boundary` and partial text is unpublished
- **WHEN** metadata publishes
- **THEN** the partial text remains hidden until its message boundary.

#### Scenario: silent structural activity remains hidden

- **GIVEN** mode is `silent`
- **WHEN** tool, plan, workspace, or pending-revision state changes
- **THEN** those changes do not become visible transcript rows.

#### Scenario: final output replaces silent progress

- **GIVEN** silent progress is visible for an owner
- **WHEN** the owner publishes a final assistant result
- **THEN** progress is removed and the final result becomes visible.

### Requirement: Transcript rendering is revision-gated

Assistant Workspace child panels SHALL render transcript content only when the
transcript render revision changes.

Toolbar, banner, details, drawer, reply, and selection updates SHALL NOT force
transcript rendering when the transcript view is unchanged.

#### Scenario: unrelated refresh skips transcript work

- **GIVEN** a child panel has rendered transcript revision `N`
- **WHEN** a subsequent snapshot updates only non-transcript panel data
- **THEN** the child panel does not invoke the transcript renderer
- **AND** the non-transcript regions still update normally.

### Requirement: Assistant Workspace refreshes SHALL target the single active shell

Assistant Workspace SHALL target the single live shell and current active pane
target when publishing snapshots, routing shell actions, routing child actions,
and binding the SkillRunner sidebar host. Assistant Workspace SHALL NOT treat a
message from any other source as an independent Assistant Workspace instance.

#### Scenario: Snapshot publishes to active shell only

- **WHEN** ACP Chat, ACP Skills, or SkillRunner state changes while the
  Assistant Workspace is open
- **THEN** the host publishes the resulting snapshot to the single live shell
  frame
- **AND** it does not publish another snapshot to an inactive library or reader
  shell copy.

#### Scenario: Child action uses active target

- **WHEN** the single Assistant Workspace shell emits a child panel action
- **THEN** the host routes the action using the shell's current active pane
  target
- **AND** it does not infer a separate target from a hidden duplicate shell.

#### Scenario: SkillRunner host binding follows shell docking

- **WHEN** the active Assistant Workspace target changes while the SkillRunner
  tab is active
- **THEN** the SkillRunner sidebar host binding is refreshed for the moved
  single shell frame
- **AND** no second SkillRunner child frame receives a sidebar host binding.

### Requirement: Single shell init SHALL flush after lifecycle convergence

Assistant Workspace SHALL treat shell load, shell ready, child ready, and active
target commit as independent lifecycle events. The host SHALL record load/ready
even when no active target is committed yet, and SHALL publish
`assistant-workspace:init` plus baseline child init snapshots only after an
active target exists and the shell is loaded or ready. ACP Chat, ACP Skills, and
SkillRunner child readiness SHALL be recorded per tab; a child ready event
SHALL publish that child's init snapshot only when the current shell/target/tab
scope has not already received baseline init. Repeated ready messages for the
same child tab and current host scope SHALL NOT publish another init snapshot.

Assistant Workspace shell and child initialization SHALL remain level-triggered
and retryable. The host SHALL retry lightweight shell init delivery until the
shell acknowledges ready, and the shell SHALL retry ready delivery until the
direct host bridge acknowledges it. Ordinary child snapshot posts SHALL NOT
schedule extra shell handshake retries. Cached child init and snapshot payloads
SHALL be replayed until the child frame can receive them.

Assistant Workspace shell SHALL accept child panel snapshots only through the
shared `assistant-workspace:child-snapshot` envelope. It SHALL NOT consume
SkillRunner sidebar snapshot messages or standalone run-dialog action messages
as workspace-shell input. Child snapshot replay SHALL be retryable, but a
cached payload generation SHALL NOT be delivered more than once to the same
child frame window.

Assistant Workspace delivery SHALL be idempotent. Reinstalling the shell bridge
for the same current shell frame window, receiving duplicate child ready
messages, attaching the same SkillRunner sidebar host repeatedly, or receiving
shell-ready after target commit baseline init SHALL NOT trigger duplicate init
or snapshot publication.

ACP Chat backend refresh MAY run at explicit backend lifecycle boundaries, but
presentation-only workspace events such as shell load and tab switch SHALL NOT
refresh ACP Chat backends. The host SHALL first publish no-refresh child
snapshots and SHALL coalesce refresh settlement into at most one no-refresh
repost.

The shared ACP frontend snapshot subscription SHALL NOT publish workspace panel
snapshots. ACP Chat panel publication SHALL be driven by its typed panel change
subscription; ACP Skills panel publication SHALL be driven by ACP Skills change
descriptors; SkillRunner publication SHALL be driven by SkillRunner runtime or
host chrome actions.

#### Scenario: Ordinary shell post does not schedule handshake retry

- **GIVEN** the host is posting child snapshots while the shell is still
  handshaking
- **WHEN** `postShellMessage()` delivers an ordinary workspace message
- **THEN** that post SHALL NOT schedule another shell handshake retry.

#### Scenario: Presentation events do not refresh ACP Chat backends

- **WHEN** the shell frame loads or the user switches Assistant Workspace tabs
- **THEN** ACP Chat backend refresh SHALL NOT be scheduled.

#### Scenario: Generic ACP frontend change does not rebuild workspace panels

- **WHEN** the shared ACP frontend snapshot subscription fires
- **THEN** the host MAY update attention metadata
- **AND** it SHALL NOT schedule a generic Assistant Workspace panel snapshot.

#### Scenario: Shell ready after target commit is acknowledged only

- **GIVEN** target commit has already published baseline init for the current
  shell/target scope
- **WHEN** shell-ready arrives for that same scope
- **THEN** the host records shell readiness
- **AND** it does not publish another baseline init snapshot set.

#### Scenario: Child ready after baseline init is acknowledged only

- **GIVEN** a child tab already received baseline init for the current
  shell/target scope
- **WHEN** that child tab reports ready
- **THEN** the host records the child as ready
- **AND** it does not publish another child init snapshot.

#### Scenario: SkillRunner task selection is one host action

- **WHEN** the user selects a SkillRunner task from the workspace drawer
- **THEN** the child sends one `select-task` action
- **AND** the host closes SkillRunner drawer chrome while handling that action.

### Requirement: ACP Skills workspace refreshes are request scoped

Assistant Workspace SHALL use ACP Skills change descriptors to avoid rebuilding or posting ACP Skills snapshots for changes that are known to be unrelated to the selected ACP Skills run.

#### Scenario: Unrelated background transcript does not rebuild inactive ACP Skills panel

- **GIVEN** Assistant Workspace is open on a tab other than ACP Skills
- **WHEN** a non-selected ACP Skills run emits a transcript-only change descriptor
- **THEN** the workspace host SHALL NOT rebuild or post an ACP Skills panel snapshot for that change
- **AND** toast and attention indicator work SHALL also be skipped when the descriptor is known to be transcript-only.

#### Scenario: Selected transcript change refreshes active ACP Skills panel

- **GIVEN** Assistant Workspace is open on the ACP Skills tab
- **AND** request `A` is the selected ACP Skills run
- **WHEN** request `A` emits a transcript or runtime-options change descriptor
- **THEN** the workspace host SHALL refresh the ACP Skills panel snapshot.

#### Scenario: Background run change refreshes navigation without changing selected owner regions

- **GIVEN** request `A` is selected and request `B` runs in the background
- **WHEN** request `B` emits one change containing source navigation plus transcript, permission, plan, control, composer, or presentation invalidations
- **THEN** the host MAY refresh the ACP Skills owner-navigation region
- **AND** it SHALL reject every owner-local invalidation for request `B` before region read or transcript mutation publication
- **AND** it SHALL NOT relabel request `B` events, sequence metadata, or item counts as belonging to request `A`.

#### Scenario: Unknown changes remain conservative

- **WHEN** an ACP Skills store change has no descriptor or is marked global
- **THEN** the workspace host SHALL use the existing conservative refresh behavior.

### Requirement: ACP Skills snapshots are signature guarded

Assistant Workspace SHALL avoid posting ACP Skills child snapshots when the bounded snapshot content is unchanged.

#### Scenario: Repeated unchanged snapshot is skipped

- **GIVEN** the host has posted an ACP Skills snapshot with signature `S`
- **WHEN** a later ordinary store-change refresh produces the same signature `S`
- **THEN** the host SHALL skip posting that child snapshot.

#### Scenario: Init and user actions force snapshot delivery

- **WHEN** ACP Skills is initialized, activated by tab selection, or refreshed after a user child action
- **THEN** the host SHALL deliver the ACP Skills snapshot even if its content signature matches the previous snapshot.

### Requirement: Child transcript rendering ignores stale same-context revisions

Assistant Workspace child transcript renderers SHALL treat transcript revisions
as monotonic within a single conversation or run context. After rendering
revision `N`, a later snapshot for the same context with revision lower than
`N` SHALL NOT repaint the transcript or replace newer child transcript state.

Loading and failed transcript states for the current context SHALL remain
renderable even when the last rendered content revision is newer.

#### Scenario: Stale same-context transcript snapshot is ignored

- **GIVEN** an Assistant Workspace child panel has rendered transcript revision
  `5` for context `A`
- **WHEN** it later receives a transcript snapshot for context `A` with revision
  `4`
- **THEN** it SHALL NOT invoke the transcript renderer for that stale snapshot
- **AND** it SHALL keep the revision `5` transcript state.

#### Scenario: Context switch resets revision guard

- **GIVEN** an Assistant Workspace child panel has rendered transcript revision
  `5` for context `A`
- **WHEN** the selected conversation or run changes to context `B`
- **AND** context `B` receives transcript revision `1`
- **THEN** the panel SHALL render context `B` revision `1`.

#### Scenario: ACP Skills equal-revision history page is accepted

- **GIVEN** the ACP Skills panel has rendered revision `5` for run `R`
- **WHEN** it receives another transcript page for run `R` with revision `5`
  and a different cursor
- **THEN** it SHALL allow that page to merge into the child page cache
- **AND** it MAY repaint if the virtual window or display-mode signature changes.

### Requirement: ACP Skills transcript SHALL be request-scoped

ACP Skills transcript rendering SHALL keep transcript render state scoped by
request id. Switching selected runs SHALL save the previous request's
transcript page/render state inside the shared transcript renderer and restore
the new request's cached state when available; otherwise the panel SHALL request
the new request's transcript page through the shared renderer. Building a panel
snapshot for a requested run SHALL NOT mutate the globally selected request;
global selection SHALL only change through explicit selection actions. Late
transcript page requests for a run that is no longer selected SHALL be ignored
instead of publishing a stale ACP Skills snapshot.

#### Scenario: Switching concurrent ACP Skills runs does not reuse transcript DOM

- **WHEN** multiple ACP Skills runs are active
- **AND** the user selects a different run while the host snapshot is still
  catching up
- **THEN** the ACP Skills panel keeps the pending request id separate from the
  previous selected run
- **AND** it does not render the previous run's transcript as the pending run
- **AND** it restores the pending request's cached transcript state when
  available
- **AND** it requests the pending request's transcript page when no cached state
  is available.

#### Scenario: Late old-run page request is ignored

- **GIVEN** the ACP Skills panel selected run changes from run A to run B
- **WHEN** a delayed transcript page request for run A reaches the host
- **THEN** the host SHALL NOT publish a forced ACP Skills snapshot for run A
- **AND** a page request for the currently selected run B SHALL still publish a
  snapshot.

### Requirement: Transcript-only refreshes SHALL preserve non-transcript DOM

Assistant Workspace child panels SHALL treat transcript rendering as isolated from managed panel chrome. A snapshot whose only visible change is transcript content, transcript pagination, transcript revision, streaming text or thought chunks, or transcript loading state SHALL NOT rebuild toolbar, banner, plan, hint, reply, context drawer, details drawer, or permission drawer DOM.

Panel chrome equivalence inputs SHALL exclude transcript revision, transcript page signatures, streaming chunk contents, transcript item counts, and transcript event counts. Details drawer equivalence inputs SHALL be derived from details drawer content, drawer actions, and drawer open or collapse state, not from transcript activity.

Every managed non-transcript Assistant Workspace region SHALL have an explicit region-level equivalence boundary containing only that region's user-visible content and open or collapsed state; on the ACP child this boundary is implemented as component props memoization. Toolbar, banner, plan, hint, reply, context drawer, details drawer, and permission drawer regions SHALL NOT be cleared, rebuilt, or otherwise mutated in the DOM when their own equivalence input is unchanged.

Transcript loading indicators SHALL be scoped by the selected transcript owner, such as backend/conversation, request id, or task key. Repeated snapshots for the same owner and same loading semantic state SHALL preserve the loading indicator DOM node identity.

#### Scenario: ACP Skills transcript update preserves details drawer DOM

- **GIVEN** the ACP Skills child panel has rendered a selected run and its details drawer
- **WHEN** the selected run receives a transcript-only snapshot during prompting
- **THEN** the transcript region MAY update
- **AND** the details drawer DOM nodes SHALL keep their identity
- **AND** the Runner details section SHALL NOT be cleared or recreated.

#### Scenario: Transcript pagination does not rebuild panel chrome

- **GIVEN** an Assistant Workspace child panel has rendered managed toolbar, banner, drawer, details, hint, reply, and permission regions
- **WHEN** a later snapshot changes only transcript page cursor, transcript revision, transcript item contents, or transcript loading state
- **THEN** only the transcript region SHALL be eligible for repaint
- **AND** all non-transcript managed regions SHALL preserve their DOM node identity.

#### Scenario: Details content changes still refresh details drawer

- **GIVEN** the details drawer has rendered with details equivalence input `A`
- **WHEN** a later snapshot changes details sections, details actions, or drawer open/collapse state and produces details equivalence input `B`
- **THEN** the details drawer MAY rebuild to reflect the new details content.

#### Scenario: Repeated loading snapshots preserve transcript spinner DOM

- **GIVEN** an Assistant Workspace child panel is showing a transcript loading indicator for selected owner `A`
- **WHEN** repeated snapshots report the same selected owner and the same loading state
- **THEN** the transcript loading indicator DOM node SHALL keep its identity
- **AND** the transcript window SHALL NOT be cleared and rebuilt.

#### Scenario: Cross-owner loading still clears stale transcript content

- **GIVEN** an Assistant Workspace child panel has rendered transcript content for owner `A`
- **WHEN** the selected owner changes to owner `B` and owner `B` is loading
- **THEN** the transcript region SHALL clear owner `A` content
- **AND** render owner `B` loading state.

#### Scenario: Non-selected prompting summaries do not repost selected loading snapshots

- **GIVEN** ACP Skills selected run `A` is hydrating and its selected transcript is loading
- **AND** another run `B` is actively prompting
- **WHEN** only run `B` transcript revision, event sequence, item count, or preview changes
- **THEN** the Assistant Workspace host snapshot signature SHALL remain unchanged for the selected loading snapshot
- **AND** the child panel SHALL NOT receive a repost that can rebuild owner `A` loading DOM.

### Requirement: Waiting-user regions are independently signature-guarded

Toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, and file-interaction regions SHALL each use stable signatures limited to their visible content and open/collapsed state. Transcript revisions, pages, chunks, counts, loading state, prompting tails, and log tails SHALL NOT enter those signatures.

#### Scenario: Transcript-only snapshot arrives during waiting-user state

- **WHEN** the selected owner's transcript changes but waiting-user content does not
- **THEN** only the transcript region SHALL render
- **AND** all non-transcript managed-region DOM identities SHALL be preserved

#### Scenario: Interaction hint changes

- **WHEN** only a visible interaction hint changes
- **THEN** only the hint region SHALL update
- **AND** reply and transcript DOM identities SHALL be preserved

### Requirement: Message counter preserves managed-region identity

Assistant message counts SHALL be rendered only by the message-counter managed region. Its owner, category values, activity, completeness, and revision SHALL NOT enter transcript, toolbar, banner, plan, hint, reply, context drawer, details drawer, or permission drawer render signatures.

#### Scenario: count-only update is region-local

- **WHEN** one selected-owner semantic count advances without another visible change
- **THEN** only the message-counter region is eligible to update
- **AND** transcript and all other managed-region nodes retain identity and interactive state.

#### Scenario: owner-first rendering does not wait for transcript hydration

- **WHEN** a selected owner changes and persisted count metadata is available
- **THEN** the message counter may render from owner metadata independently
- **AND** indexed page read and full mirror hydration remain separate transcript operations.

#### Scenario: child panel guard does not swallow count-only snapshots

- **WHEN** a child panel receives a snapshot whose only visible change is message-count state
- **THEN** the snapshot reaches the shared message-counter region guard
- **AND** unchanged toolbar, banner, transcript, reply, and drawer regions retain DOM identity.

### Requirement: Assistant Workspace publishes owner-scoped managed regions

Assistant Workspace SHALL represent runtime UI work as typed, owner-scoped region publications. A publication SHALL carry only the DTO required by its managed region, and the host SHALL apply source and owner guards before reading transcript pages, building DTOs, or serializing payloads.

Chat owners SHALL be identified by backend plus conversation and Skills owners SHALL be identified by request. A Chat change SHALL NOT publish the active Skills panel, and a Skills change SHALL NOT publish the active Chat panel.

#### Scenario: Inactive source changes

- **GIVEN** Assistant Workspace is closed or a source is not the active target
- **WHEN** that source emits a runtime change
- **THEN** the host SHALL drop the publication request before DTO construction
- **AND** it SHALL NOT build either the matching or opposite tab publication.

#### Scenario: Owner does not match selection

- **WHEN** a runtime change belongs to a conversation or request other than the selected owner
- **THEN** the host SHALL reject it before transcript page read, DTO construction, or serialization.

#### Scenario: Source-scoped navigation is independent from owner-local content

- **WHEN** one runtime change contains both owner-navigation and owner-local publication kinds
- **THEN** the publication runtime SHALL evaluate owner-navigation against the active source
- **AND** it SHALL evaluate transcript and all other managed regions against the exact selected owner
- **AND** accepting owner-navigation SHALL NOT cause an owner mismatch to be accepted for any owner-local kind.

### Requirement: Managed regions use independent stable signatures

Toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, transcript, and other managed regions SHALL each use a signature containing only that region's user-visible content and open or collapsed state. Equal owner, kind, and signature SHALL be skipped before post unless the publication is an explicit initialization or activation.

Baseline or chrome DTOs SHALL NOT contain selected transcript pages, transcript revisions, streaming or event counts, message-count revisions, or transcript loading state.

#### Scenario: Transcript-only publication preserves chrome identity

- **WHEN** a selected owner receives a transcript-only or message-count-only change
- **THEN** toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, and Runner pane DOM identity SHALL remain unchanged.

#### Scenario: Repeated region DTO is skipped

- **GIVEN** a region DTO has already been posted for an owner
- **WHEN** the host requests an equal owner, kind, and DTO again
- **THEN** the host SHALL skip the publication before post.

### Requirement: Region publications are acknowledged and stale-safe

The shell SHALL forward typed region publications without combining transcript and chrome state. The child SHALL reject publications for an old owner or a stale same-owner revision, apply only the addressed region, and acknowledge shell receipt, child apply, and render completion with owner, kind, revision, and signature identity.

#### Scenario: Old owner publication arrives after selection

- **GIVEN** the child has switched from owner A to owner B
- **WHEN** a delayed publication for owner A arrives
- **THEN** the publication SHALL NOT modify visible DOM
- **AND** its acknowledgement SHALL identify the rejection rather than successful render completion.

#### Scenario: Successful publication completes acknowledgement chain

- **WHEN** a current-owner publication is posted and applied
- **THEN** shell receive, child apply, and render completion SHALL be attributable to the same publication identity.

#### Scenario: Multiple full snapshots arrive before one render frame

- **WHEN** multiple identified Chat or Skills snapshots reach a child before its scheduled render frame
- **THEN** the child SHALL apply and acknowledge them in delivery order
- **AND** it SHALL NOT silently replace an earlier posted snapshot without a lifecycle terminal state.

#### Scenario: A newer shell cache generation replaces an identified snapshot

- **WHEN** a newer identified snapshot replaces an init or snapshot cache generation before the older publication completes in the child
- **THEN** the shell SHALL acknowledge the older identity as superseded
- **AND** the host lifecycle ledger SHALL no longer leave that publication pending.

### Requirement: Region publication preserves transcript loading invariants

Owner switching SHALL remain owner-first, loading-first, and page-first. Indexed page read and full mirror hydrate SHALL NOT block first paint; live or prompting mirrors SHALL remain pinned, and owner-scoped cold full mirror caches SHALL remain optional performance caches rather than visibility requirements.

#### Scenario: Cold owner is selected

- **WHEN** the selected Chat conversation or Skills request changes to a cold owner
- **THEN** the child SHALL first receive that owner's loading or empty transcript publication
- **AND** indexed page content MAY render before full mirror hydrate completes.

### Requirement: Transcript region vocabulary is singular

All Assistant Workspace Host read models, initialization snapshots, typed publications, shared browser models, and transcript renderers SHALL use one `AssistantWorkspaceTranscriptRegion`. No surface-specific transcript state or page alias SHALL remain in production Workspace paths.

#### Scenario: Transcript publication applies on either surface

- **WHEN** a snapshot or delta is accepted
- **THEN** the same receiver updates the same transcript region model
- **AND** no adapter copies state into a second transcript field.

### Requirement: Transcript updates preserve managed region identity

Transcript-only publication SHALL NOT rebuild toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, or Runner pane. Append SHALL preserve the target row and text-node identity when structure is unchanged.

#### Scenario: Streaming append is applied

- **WHEN** either surface appends text to a visible streaming item
- **THEN** only the existing target text node changes
- **AND** all non-transcript managed region identities remain unchanged.

### Requirement: Steady transcript rendering is target-local

Assistant Workspace SHALL represent accepted transcript mutations as target-local render effects. Steady append, patch, upsert, delete, and off-page metadata effects SHALL preserve every unaffected transcript row and every non-transcript managed-region DOM node. Transcript revision changes alone SHALL NOT clear or rebuild the transcript container.

#### Scenario: Streaming text appends

- **WHEN** an accepted delta appends text to a visible item
- **THEN** the renderer appends to that item's text node
- **AND** the row, text node, other rows, toolbar, banner, plan, hint, reply, context, details, and permission nodes retain identity.

#### Scenario: Historical page receives an off-page delta

- **WHEN** a selected historical page receives a delta outside its window
- **THEN** only bounded page metadata changes
- **AND** no tail item is inserted and scroll position does not jump.

### Requirement: Child initialization is delivery-based and generation-scoped

Assistant Workspace SHALL consider a child initialized only after a publication enters the delivery lifecycle for the current child document generation. Scheduling asynchronous snapshot preparation SHALL NOT suppress a later ready-triggered initialization.

#### Scenario: Child ready races snapshot preparation

- **WHEN** child ready arrives while initial page preparation is pending
- **THEN** the current generation still receives one ordered owner-first/page-first initialization
- **AND** duplicate ready messages for that generation do not create duplicate DOM work.

### Requirement: Transcript geometry work is dirty-row scoped

Steady transcript mutation SHALL measure only newly inserted or content-changing rows. Unchanged rows SHALL retain cached height and DOM position. A height change SHALL update scroll geometry or spacers through one coalesced reconcile against committed live state without scheduling a full transcript rebuild. Scheduler tokens and pending controller state SHALL NOT be committed from a staged virtual-state clone.

#### Scenario: One row changes in an 80-item page

- **WHEN** one visible item is patched without changing its neighbors
- **THEN** only its presentation row is eligible for rerender and measurement
- **AND** measurement work does not grow with the other 79 items.

#### Scenario: Terminal Markdown converges in the current mutation

- **GIVEN** a visible assistant message is streaming as plain text
- **WHEN** its terminal patch changes it to a complete Markdown message
- **THEN** the existing row SHALL render the Markdown body during that mutation
- **AND** virtual geometry SHALL reconcile from the terminal measured height
- **AND** no owner switch, tab switch, or later transcript event SHALL be required.

#### Scenario: Consecutive tall-row changes remain schedulable

- **GIVEN** a live transcript row changes height across consecutive mutation batches
- **WHEN** one committed geometry reconcile completes and a later measurement changes again
- **THEN** the later change SHALL schedule a new bounded reconcile
- **AND** pending scheduler state SHALL clear after convergence
- **AND** the transcript row and every non-transcript managed-region node SHALL retain identity.

#### Scenario: Failed staged mutation does not poison live scheduling

- **WHEN** a staged transcript mutation fails before its exact commit
- **THEN** it SHALL NOT leave live scheduler state marked as pending
- **AND** a later valid mutation SHALL remain eligible to reconcile geometry.

### Requirement: Message-count publications render their typed region directly

Chat and Skills children SHALL render `message-counts` directly from the typed count payload. Count-only application SHALL NOT project or normalize a complete panel model and SHALL NOT invoke a full panel/runtime renderer.

#### Scenario: Tool count advances at a transcript boundary

- **WHEN** a selected owner receives a count-only publication
- **THEN** the shared message-counter renderer updates only the count nodes
- **AND** transcript, toolbar, banner, plan, hint, reply and drawer nodes retain identity.

### Requirement: Shared child delivery preserves identities while sharing a render frame

Chat and Skills SHALL use the same publication view/controller. Publications delivered before one render frame MAY share that frame, but the controller SHALL apply them in delivery order and SHALL emit a terminal render acknowledgement for every publication identity after its requested DOM work succeeds.

#### Scenario: Transcript and count publications describe one hard boundary

- **WHEN** transcript and message-count publications reach the child before the next render frame
- **THEN** both region effects complete in delivery order in that frame
- **AND** neither publication identity is skipped or merged into the other.

### Requirement: ACP Workspace surfaces use one owner-scoped runtime

ACP Chat and ACP Skills SHALL register source adapters with one shared Workspace surface runtime. The runtime SHALL own initialization, owner-scoped scheduling, region signatures, publication lifecycle, rebase, and owner cleanup. Sidebar and source adapters SHALL NOT implement a second publication scheduler or DTO conversion layer.

#### Scenario: Active owner changes

- **WHEN** Chat conversation or Skills run selection changes
- **THEN** the shared runtime clears the prior owner's pending lanes and publishes the new owner loading-first
- **AND** no global single-slot timer can overwrite another owner or region.

#### Scenario: Workspace target deactivates

- **WHEN** the active Assistant Workspace target closes or moves to another host target
- **THEN** the shared runtime terminates every pending publication lifecycle as superseded and clears queued owner work
- **AND** reopening the same child document continues monotonic region and delivery revisions without inheriting an undeliverable identity.

#### Scenario: An inactive source emits a change

- **WHEN** a producer change targets a hidden or non-selected ACP source
- **THEN** the runtime drops it before invoking any owner read-model builder.

### Requirement: ACP initialization is typed and region-scoped

ACP Chat and ACP Skills initialization and activation SHALL publish an ordered set of canonical region publications and SHALL NOT build a complete panel or frontend snapshot. Transcript loading SHALL precede its ready indexed page.

#### Scenario: Workspace opens for the first time

- **WHEN** the active ACP child document becomes ready
- **THEN** it receives owner-first loading state followed by the current typed regions and ready transcript page
- **AND** transcript visibility does not depend on another session or tab switch.

#### Scenario: Chat backend refresh changes navigation

- **WHEN** refresh completes and selects or updates a session
- **THEN** the typed navigation change follows normal publication ordering
- **AND** the selected historical session does not remain permanently empty.

### Requirement: Owner navigation is not lifecycle status

Backend/conversation and run-list/selection changes SHALL use the canonical owner-navigation region. Baseline status SHALL contain only current owner lifecycle status.

#### Scenario: Conversation list changes

- **WHEN** Chat creates, renames, archives, or selects a conversation
- **THEN** owner navigation updates without rebuilding transcript or masquerading as baseline status.

### Requirement: Managed regions render by their own equivalence boundaries

The child SHALL apply toolbar, banner, plan, hint, reply, context, details,
and permission region updates only after successful rendering. A failed
region render SHALL leave the previously committed DOM and equivalence
state untouched. Transcript, loading, streaming, and count-only changes
SHALL NOT rebuild unrelated regions.

#### Scenario: A region renderer fails

- **WHEN** a render throws before commit
- **THEN** the previous region DOM and equivalence state remain committed
- **AND** the same publication content can be retried.

### Requirement: Managed regions preserve stable layout identity

The shared child SHALL keep main layout containers mounted while region
signatures independently govern toolbar, banner, conversation, plan, hint,
reply, drawer, details, permission, and transcript rendering.

#### Scenario: Owner navigation clears selection

- **WHEN** navigation atomically replaces the old selection with empty loading
- **THEN** old owner content is invalidated
- **AND** non-content layout containers retain their DOM identity.

### Requirement: Renderer failure diagnostics are bounded and retryable

Transcript rendering SHALL return a bounded stage, code, and render path.
Failed effects SHALL not commit signatures or partial renderer state.

#### Scenario: Virtual row reconciliation rejects a delta

- **WHEN** the renderer cannot locate a planned row
- **THEN** the ACK contains the bounded reconciliation failure
- **AND** the next valid publication can retry without requiring stale state.

### Requirement: Every shared ACP managed region has an independent equivalence boundary

The Assistant Workspace SHALL reconcile toolbar, banner, message counts,
transcript, plan, hint, composer, context drawer, details drawer, and
permission drawer from an independent region equivalence boundary —
component props on the ACP child — containing only that region's visible
content and local open or
collapsed state. Transcript revision, page signature, streaming chunks, item
counts, prompting tail, and log tail SHALL NOT enter non-transcript region
props.

#### Scenario: A transcript-only publication is accepted

- **WHEN** a transcript delta, loading state, or streaming chunk changes for the selected owner
- **THEN** only the transcript region is rendered
- **AND** toolbar, banner, plan, hint, composer, context, details, permission, and Runner pane nodes retain identity.

### Requirement: Empty and owner-switch states preserve layout geometry

The main grid SHALL remain mounted as transcript, plan, hint, and composer rows
when no owner is selected, while owner changes SHALL close local context chrome
and publish the new owner loading state before indexed page or full-mirror work.

#### Scenario: Selection changes from one cold owner to another

- **WHEN** the user selects a different session or run
- **THEN** the drawer closes synchronously and the new owner empty/loading state paints first
- **AND** transcript hydration does not block the first owner-specific paint.

### Requirement: Hint has an explicit publication-to-region route

The managed-region registry SHALL include the hint region. Owner-control and
permission publications SHALL be allowed to update it, while composer and
transcript publications SHALL NOT rebuild it. Its signature SHALL contain only
the projected semantic interaction visible to the user.

#### Scenario: Composer options change without interaction change

- **WHEN** mode, model, reasoning, usage, or reply availability changes while the owner hint is unchanged
- **THEN** only the composer region is reconciled
- **AND** the hint node retains identity.

### Requirement: Region isolation is locked at subtree node identity

Assistant Workspace UI invariant tests SHALL compare the full subtree node
list of every managed region element-wise by reference across
transcript-only, loading, streaming, and counts-only updates. Comparing only
region mount nodes SHALL NOT be accepted as evidence of isolation, because
mounts are reused permanently and a guard miss can rebuild mount content
while preserving the mount node.

#### Scenario: Transcript-only publication arrives

- **WHEN** only the transcript selection state changes
- **THEN** every non-transcript managed region's subtree node list SHALL be
  element-wise identical before and after the render
- **AND** a guard miss that rebuilds any region content SHALL fail the test
  even when the region mount node itself is preserved.

#### Scenario: Counts-only update arrives

- **WHEN** only message-count values change
- **THEN** counter item nodes SHALL be preserved by identity
- **AND** every other managed region's subtree SHALL be element-wise
  identical.

### Requirement: Queue-only updates SHALL be isolated to task-drawer managed regions

ACP Skills and SkillRunner queue subscription events MUST update only the task
drawer region whose visible queue projection changed. Queue revisions, queue
counts, FIFO positions, or cancellation state MUST NOT enter transcript,
toolbar, banner, plan, hint, reply, context drawer, details drawer, permission
drawer, or whole-runner render signatures.

#### Scenario: Background queued unit is added

- **WHEN** a Host-queued unit is added for a backend represented in the task drawer
- **THEN** the affected drawer section SHALL update
- **AND** existing transcript and non-drawer managed-region DOM identities SHALL remain unchanged

#### Scenario: Queued unit is canceled

- **WHEN** a queued row disappears after cancellation
- **THEN** only the affected queued backend group and necessary parent drawer signatures SHALL change
- **AND** the selected run owner and transcript window SHALL remain unchanged

#### Scenario: Queue changes for an unchanged drawer group

- **WHEN** a queue notification does not alter a rendered drawer group's visible content
- **THEN** that group's signature guard SHALL suppress DOM clear or rebuild

### Requirement: Task-section collapse state SHALL have a drawer-owned signature

The Running, Queued, and Completed sections and their backend groups MUST
preserve collapse state through unrelated transcript, run-status, and queue
updates. Their signatures MUST contain only the user-visible rows and
drawer-owned open/collapsed state.

#### Scenario: Transcript streams while queued section is collapsed

- **WHEN** transcript-only updates arrive while the user has collapsed a queued section or backend group
- **THEN** the collapse state and drawer DOM identity SHALL remain stable

#### Scenario: User collapses a running or completed section

- **WHEN** the user toggles the Running or Completed section header
- **THEN** only that section's drawer-owned collapse state SHALL change
- **AND** transcript and non-drawer managed-region DOM identities SHALL remain stable

#### Scenario: A row is added to an expanded backend group

- **WHEN** a queued row is added to an expanded backend group
- **THEN** the group SHALL remain expanded
- **AND** unrelated backend groups SHALL retain their DOM identity

### Requirement: Submission decoration SHALL be task-row scoped

Submission symbol, tooltip, provider/model display metadata, and resumption-pending state SHALL enter only the affected task row's equivalence boundary and the necessary task-drawer parent equivalence inputs. They MUST NOT enter the equivalence boundaries of transcript, toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, or the whole-runner component; on the ACP child these boundaries are implemented as component props memoization.

#### Scenario: Submission decoration changes

- **WHEN** an unfinished row gains or changes resumption-pending or submission display fields
- **THEN** the affected drawer row SHALL update
- **AND** transcript, Runner pane, and every non-drawer managed region SHALL retain DOM identity

### Requirement: SkillRunner tab refreshes flow through the publication plane

The SkillRunner tab SHALL be refreshed only through v1 region publications
delivered to the shared assistant child page. Transcript-only updates
SHALL NOT rebuild toolbar, banner, message counts, hint, composer, context
drawer, details drawer, or permission drawer DOM. Selecting a different
run SHALL publish the new owner's loading-first state before any
transcript page read, and transcript content SHALL render page first from
the in-memory session history while background history hydration proceeds.
No legacy full-snapshot channel SHALL remain.

#### Scenario: SkillRunner transcript update preserves chrome DOM

- **GIVEN** the SkillRunner tab has rendered a selected run with its chrome regions
- **WHEN** the run receives a transcript-only snapshot while streaming
- **THEN** only the transcript region MAY repaint
- **AND** every non-transcript managed region SHALL preserve its DOM node identity.

#### Scenario: SkillRunner owner switch is owner first

- **GIVEN** the SkillRunner tab shows run A
- **WHEN** the user selects run B whose history is not yet hydrated
- **THEN** the workspace publishes run B's loading-first regions before reading its transcript page
- **AND** the transcript renders the first available page without waiting for full history hydration.
