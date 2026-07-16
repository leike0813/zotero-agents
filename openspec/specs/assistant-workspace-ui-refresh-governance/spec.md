# assistant-workspace-ui-refresh-governance Specification

## Purpose
Governs how Assistant Workspace panels classify, coalesce, and publish UI refresh events to prevent high-frequency streaming updates from overwhelming the interface while preserving responsiveness for critical states and structural transcript events.
## Requirements
### Requirement: Assistant Workspace UI publish events are governed

Assistant Workspace panels SHALL classify runtime refreshes as `critical`,
`boundary`, `live`, or `background` and SHALL apply the global `live`,
`boundary`, or `silent` execution display mode before publishing.

Critical events SHALL publish immediately and background events SHALL not publish. In `live`, text/thought live events SHALL publish naturally and metadata live events SHALL use the shared cadence. In `boundary`, live text SHALL remain unpublished until a complete semantic message or other existing boundary. In `silent`, ordinary live and boundary events SHALL not publish transcript content; only a semantic-message count change or critical interaction/terminal state SHALL publish.

#### Scenario: live text advances naturally

- **GIVEN** execution display mode is `live`
- **WHEN** a panel receives text or thought chunks
- **THEN** the UI-visible transcript advances without waiting for metadata cadence.

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

Panel chrome signatures SHALL exclude transcript revision, transcript page signatures, streaming chunk contents, transcript item counts, and transcript event counts. Details drawer signatures SHALL be derived from details drawer content, drawer actions, and drawer open or collapse state, not from transcript activity.

Every managed non-transcript Assistant Workspace region SHALL have an explicit region-level signature guard. Toolbar, banner, plan, hint, reply, context drawer, details drawer, and permission drawer regions SHALL NOT be cleared or rebuilt when their own signature is unchanged.

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

- **GIVEN** the details drawer has rendered with details signature `A`
- **WHEN** a later snapshot changes details sections, details actions, or drawer open/collapse state and produces details signature `B`
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

Steady transcript mutation SHALL measure only newly inserted or content-changing rows. Unchanged rows SHALL retain cached height and DOM position. A height change SHALL update scroll geometry or spacers without scheduling another full transcript render.

#### Scenario: One row changes in an 80-item page

- **WHEN** one visible item is patched without changing its neighbors
- **THEN** only its presentation row is eligible for rerender and measurement
- **AND** measurement work does not grow with the other 79 items.

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

### Requirement: ACP initialization is typed and region-scoped

ACP Chat and ACP Skills initialization and activation SHALL publish an ordered set of canonical region publications and SHALL NOT build a complete panel or frontend snapshot. Transcript loading SHALL precede its ready indexed page.

#### Scenario: Workspace opens for the first time

- **WHEN** the active ACP child document becomes ready
- **THEN** it receives owner-first loading state followed by the current typed regions and ready transcript page
- **AND** transcript visibility does not depend on another session or tab switch.

### Requirement: Owner navigation is not lifecycle status

Backend/conversation and run-list/selection changes SHALL use the canonical owner-navigation region. Baseline status SHALL contain only current owner lifecycle status.

#### Scenario: Conversation list changes

- **WHEN** Chat creates, renames, archives, or selects a conversation
- **THEN** owner navigation updates without rebuilding transcript or masquerading as baseline status.

