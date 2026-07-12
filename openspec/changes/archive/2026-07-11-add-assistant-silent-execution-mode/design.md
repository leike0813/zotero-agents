## Context

Assistant Workspace currently exposes one global boolean preference, `assistantStreamingRenderEnabled`. Enabled mode publishes text and thought chunks as they arrive. Disabled mode suppresses partial text publication until message or run boundaries, but canonical ACP Chat and ACP Skills transcript mirrors still receive every chunk and the shared transcript writer still persists the complete event stream. Structural tool, plan, status, and workspace-activity rows also remain visible. ACP Skills independently scans the workspace every 15 seconds while a prompt is active.

The transcript persistence work already provides an owner-scoped buffered writer, synchronous live mirrors, rebuildable indexes, and durability barriers. Silent execution must reduce work before those mechanisms: a suppressed event must not become a mirror mutation, transcript event, event-sequence increment, index update, or chunk-level run/session snapshot write. The existing writer remains the only transcript durability mechanism.

The UI is constrained by Assistant Workspace region ownership. Transcript progress may update the transcript region, but it must not rebuild toolbar, banner, plan, hint, reply, context drawer, details drawer, or permission drawer DOM. Cold transcript page reads, owner-first paint, pinned live mirrors, and full-mirror hydration remain independent concerns and cannot be weakened.

The feature is global and affects ACP Chat, ACP Skills, and SkillRunner. ACP Chat and ACP Skills consume ACP session updates and must share one semantic assistant-message segmentation policy. SkillRunner consumes its own complete conversation events and needs an equivalent final-only projection without changing backend observation or interaction semantics.

## Goals / Non-Goals

**Goals:**

- Replace the boolean live-render choice with `live`, `boundary`, and `silent` modes backed by one persisted preference.
- Preserve the current enabled behavior as `live` and the current disabled behavior as `boundary`.
- In `silent`, publish a low-frequency semantic assistant-message count while work is active and only user content, final assistant results, interaction-required states, and terminal outcomes otherwise.
- Prevent suppressed ACP Chat and ACP Skills events from entering transcript mirrors or persistence.
- Stop ACP Skills workspace-activity observation while silent.
- Apply preference changes immediately without deleting existing history or backfilling omitted content.
- Preserve protocol execution, output validation, permission/auth flows, recovery, cancellation, durability, pagination, and managed-region DOM identity.

**Non-Goals:**

- Changing ACP, SkillRunner, workflow, or backend wire protocols.
- Rewriting historical transcript JSONL or changing its event/index schema.
- Making the transient assistant-message count an audit or history metric.
- Suppressing detailed ACP audit files or output revision artifacts.
- Introducing a second transcript buffer, cache, or persistence path.
- Reconstructing content that was intentionally omitted while silent.

## Decisions

### Replace the boolean preference and thin publish wrapper with one display policy

Add `src/modules/assistantExecutionDisplayPolicy.ts` as the single source for mode state and publication decisions:

```ts
export type AssistantExecutionDisplayMode =
  | "live"
  | "boundary"
  | "silent";

export type AssistantWorkspacePublishReason =
  | "critical"
  | "boundary"
  | "live"
  | "background";

export function getAssistantExecutionDisplayMode():
  AssistantExecutionDisplayMode;
export function setAssistantExecutionDisplayMode(
  mode: AssistantExecutionDisplayMode,
): AssistantExecutionDisplayMode;
export function subscribeAssistantExecutionDisplayMode(
  listener: (mode: AssistantExecutionDisplayMode) => void,
): () => void;
export function canPublishAssistantWorkspaceLiveUpdates(): boolean;
export function isAssistantSilentExecutionMode(): boolean;
```

`canPublishAssistantWorkspaceLiveUpdates()` remains as the semantic query used by existing live-cadence call sites, but its implementation becomes `mode === "live"`; callers no longer infer silent behavior from a boolean. A policy helper classifies `critical`, `boundary`, `live`, and `background`: critical always publishes, background never publishes, live publishes only in `live`, and boundary publishes in `live` and `boundary`. Silent terminal/interaction publication is explicitly marked critical by the owning runtime rather than treating every old boundary as visible.

Add `assistantExecutionDisplayMode: string` to the plugin preference map. Fresh installs normalize missing or invalid values to `live`. When the new preference has no valid value, read the old `assistantStreamingRenderEnabled` boolean and map `true` to `live` and `false` to `boundary`. The first explicit mode write stores only the new preference; after that the old value is ignored and is not cleared. The observer watches the new preference, deduplicates synchronous setter/observer notifications, and keeps all open surfaces synchronized.

Delete `assistantStreamingRenderPreference.ts` and fold `assistantWorkspaceUiPublishPolicy.ts` into the new module. Retaining both was rejected because it would permit boolean and enum policy to drift.

### Change the child snapshot and action contract atomically

Replace every child snapshot `streamingRenderEnabled` field with:

```ts
executionDisplayMode: AssistantExecutionDisplayMode;
executionProgress?: {
  scopeKey: string;
  active: boolean;
  agentMessageCount: number;
  revision: number;
};
```

`scopeKey` is the exact transcript owner: ACP Chat uses `backendId + "\n" + conversationId`; ACP Skills uses `requestId`; SkillRunner uses its stable run key/request id. ACP Chat resets progress at each prompt, while ACP Skills and SkillRunner reset it when a run is created. Progress is memory-only, owner-scoped, and omitted after terminal publication. It never changes transcript page `total`, `eventSeq`, cursors, index state, or persisted metadata.

Replace `set-streaming-render-enabled` with `set-execution-display-mode` and payload `{ mode }`. Host routing validates the enum before calling the setter. Preferences uses the same setter and observer; neither toolbar nor Preferences keeps an authoritative local copy.

### Maintain semantic ACP progress before transcript projection

Add `src/modules/acpExecutionProgress.ts`. It is a bounded owner-state module, not a transcript store:

```ts
export type AcpExecutionProgressState = {
  scopeKey: string;
  agentMessageCount: number;
  revision: number;
  assistantSegmentOpen: boolean;
  terminalCandidateChunks: string[];
};

export type AcpExecutionProgressChange = {
  countChanged: boolean;
  candidateChanged: boolean;
  segmentClosed: boolean;
};
```

The state machine uses `classifyAcpTranscriptSessionUpdate()` from `acpTranscriptBoundary.ts`; Chat and Skills must not maintain separate kind lists.

- The first text `agent_message_chunk` while `assistantSegmentOpen` is false opens a segment, increments `agentMessageCount` and `revision`, and appends the chunk.
- Later chunks in the same segment append text only. They do not increment progress revision or publish UI.
- `agent_thought_chunk` never increments the count. When thought begins after assistant text, it closes the assistant segment and discards its terminal candidate because that message is no longer the last post-boundary assistant segment.
- A new `tool_call`, plan, user message, explicit turn boundary, or request terminal closes the segment. Tool/plan/user boundaries discard the candidate; request terminal extracts it.
- `tool_call_update`, usage, status, workspace activity, current-mode/config/session metadata, and other soft side channels do not close the assistant segment.
- Empty/non-text chunks do nothing.

The module exposes reset, update, terminal-take, discard, snapshot, and owner-release operations. It stores only the current candidate and count; it does not mirror thoughts, tools, or prior assistant segments. ACP Skills uses the count/state transition but relies on validated output projection for final text, so it discards raw candidates at terminal.

### Apply an explicit three-mode behavior matrix

| Behavior | `live` | `boundary` | `silent` |
| --- | --- | --- | --- |
| Assistant chunks | Publish naturally | Publish at semantic boundary | First chunk updates count; text hidden |
| Thought | Publish naturally | Publish complete thought boundary | Ignore for count/UI/transcript |
| Tool call/update | Structural transcript behavior | Structural transcript behavior | Protocol handling only |
| Plan/ordinary status | Current behavior | Current behavior | Canonical business state only when required |
| User message/reply | Persist and show | Persist and show | Persist and show |
| Permission/auth/waiting | Immediate | Immediate | Immediate critical state |
| Final assistant result | Persist and show | Persist and show | One terminal write and display |
| Success/failure/cancel | Immediate | Immediate | Immediate critical state |
| ACP Skills workspace activity | Observe | Observe | Do not observe |

`boundary` is deliberately not redefined as silent-lite. Existing users who disabled live rendering retain tool, plan, thought-boundary, and structural behavior.

### Gate ACP Chat before mirror and writer mutation

Extend `AcpChatSessionRuntime` with the current prompt progress owner and mode-transition bookkeeping. At prompt start, reset the owner progress before publishing the prompting snapshot. In `handleSessionUpdate()`:

1. Always retain protocol/lifecycle handling required for function.
2. Feed relevant update kinds to the shared progress state.
3. If mode is not silent, run the current transcript projection unchanged.
4. If mode is silent:
   - `agent_message_chunk` updates only progress/candidate. Emit one transcript-progress change when the count increments; later chunks emit nothing and schedule no persistence.
   - thought, tool, plan, and ordinary transcript status do not call `pushItem`, `patchTranscriptItem`, `appendTranscriptText`, or `queueChatTranscriptEvent`.
   - usage and runtime option metadata may update canonical memory but use background publication and do not schedule chunk-level session snapshot persistence.
   - user messages continue through the normal low-frequency transcript path.

Permission, auth, waiting, failure, cancellation, and terminal lifecycle are represented by stable semantic status codes and remain critical. They may add a compact status item; tests assert codes/state rather than exact localized prose.

When `adapter.prompt()` settles, take the last candidate exactly once. A normal completion creates one complete assistant message. Error, refusal, max-token/max-turn stop, disconnect, or cancellation creates an error-state message if candidate text exists, plus the critical terminal state. If no candidate exists, only the terminal state is published. Flush the existing owner transcript barrier after the terminal write. Suppressed updates must leave `transcriptItemCount`, `transcriptEventSeq`, transcript revision, writer pending-entry diagnostics, and index diagnostics unchanged.

On transition into silent, seal any old-mode active streaming message/thought once through the old transcript path and clear active ids. Existing history remains visible and durable. Start a silent candidate only from subsequent events. On transition out of silent, discard its candidate and do not backfill; the next assistant chunk starts a new normal segment. Preference changes outside the panel use the same transition callback.

`acpChatPanelReadModel.ts` passes `executionDisplayMode` and progress. Existing `boundary` page filtering continues to omit streaming message/thought rows. Silent progress is an overlay and never synthesized into `selectedTranscriptPage`.

### Gate ACP Skills before transcript events and soft run persistence

In `recordAcpSkillRunSessionUpdate()` feed updates to owner progress first. In silent mode:

- Text chunks do not call `appendTextChunk`, `queueTranscriptEvent`, `scheduleSoftRunPersist`, or transcript change emission. Only a count increment emits an owner-scoped progress change.
- Thought chunks, tool calls/updates, and plans do not create transcript events. Tool and permission protocol functionality remains active through their existing non-transcript pathways.
- Usage may remain in canonical runtime memory, but it is persisted at an existing critical/lifecycle boundary rather than per chunk.
- `completeAcpSkillRunTranscriptTurnBoundary()` clears progress state without patching a nonexistent streaming item.

`recordAcpSkillRunOutputRevision()` continues to append invalid revision evidence to the separate output-revision artifact but does not delete/project an assistant transcript item in silent mode. `projectAcpSkillRunOutputEnvelopeToTranscript({ kind: "pending" })` retains business revision state but does not replace the transcript assistant message. Only `{ kind: "final" }` formats the validated final envelope and performs one complete assistant upsert. User replies, permission items, waiting-user/auth state, terminal run status, and final apply outcome remain eligible transcript structures; repair progress, diagnostics, ordinary status, and workspace activity are suppressed by a named silent critical-stage allowlist.

The allowlist is semantic and backend-agnostic. It contains interaction-required and terminal categories, not provider ids, agent names, commands, or display text.

### Stop ACP Skills workspace observation rather than merely hiding it

The orchestrator tracks whether its prompt is active and subscribes to display-mode changes for the lifetime of the controller. `startWorkspaceActivityHeartbeat()` returns without an initial scan, refresh-timer registration, or interval creation when silent. Entering silent clears the current timer immediately. An in-flight scan cannot be cancelled reliably, so it rechecks mode and prompt activity immediately before `upsertAcpSkillRun()` and discards the result when silent. Leaving silent restarts observation only when the same prompt is still active. Cleanup unsubscribes and clears the timer.

This logic applies to both new and recovered interactive sessions. Merely filtering `workspace-activity` transcript rows was rejected because it retains the filesystem load the feature is meant to remove.

### Filter SkillRunner publication without changing observation

SkillRunner continues receiving foreground chat SSE, refreshing pending/auth state, and maintaining bounded canonical messages. Add an execution-progress counter to each `RunDialogEntry`.

- `assistant_process` never changes silent transcript publication, regardless of reasoning/tool/command process type.
- `assistant_message` increments semantic progress but is omitted from the published silent conversation.
- `assistant_final` publishes immediately. If it replaces/promotes an `assistant_message` with the same message family/id, replacement id, or existing attempt/text fallback, it does not increment the count again. A standalone final increments once.
- User entries, interaction replies, auth submissions, permission state, waiting-user/auth, error, cancel, and terminal run state remain immediate.

Reuse the existing promotion matcher instead of creating a second final-deduplication rule. `resolveRunWorkspaceTranscriptMessages()` receives the display mode and returns only eligible entries in silent mode. Process events do not change the visible transcript signature; a count increment changes only execution-progress revision.

### Render a synchronized accessible three-segment control

Replace `buildStreamingRenderToggleAction()` with a display-mode control model containing the three values and localized labels “Live / By message / Silent”. The shared renderer emits one `role="radiogroup"` and three `role="radio"` buttons with `aria-checked`, title, and accessible label. Click, ArrowLeft/ArrowRight, ArrowUp/ArrowDown, Home, and End select a value and emit the mode action. Live uses green, boundary amber, and silent neutral gray. Toolbar flex wrapping keeps reply/send/cancel controls usable at narrow widths.

Preferences replaces the checkbox with the same three choices and subscription behavior. All existing locales receive mode labels and help text. Tests target semantic attributes and selected mode, not exact prose or colors.

### Keep silent progress inside the transcript managed region

Child scripts render `executionProgress` as one stable tail node owned by the selected transcript owner. It is not a transcript page item. The progress signature is exactly owner scope, active state, count, and progress revision. Same-owner updates reuse the node and update its count text. Terminal publication removes it and renders the durable terminal row/page.

No progress, transcript revision, page signature, chunk, item/event count, prompting tail, or log tail enters the panel chrome render key. Mode itself is allowed in the toolbar signature because it changes visible toolbar state. Toolbar, banner, plan, hint, reply, context drawer, details drawer, and permission drawer retain independent region guards. Tests hold references to all managed region roots/interactive nodes across count updates and assert identity.

### File-level implementation map

Add `assistantExecutionDisplayPolicy.ts`, `acpExecutionProgress.ts`, and a replacement three-mode preference test. Delete the old streaming preference/publish modules and boolean preference test.

Update preference wiring in `addon/prefs.js`, `src/utils/prefs.ts`, and `src/hooks.ts`; mode propagation in `assistantWorkspaceSidebar.ts`, `preferenceScript.ts`, `acpChatPanelReadModel.ts`, and transcript page projection; ACP behavior in `acpTranscriptBoundary.ts`, `acpSessionManager.ts`, `acpSkillRunStore.ts`, and `acpSkillRunnerOrchestrator.ts`; SkillRunner behavior in `skillRunnerRunDialog.ts`; shared/child UI model, renderer, CSS, ACP Chat script, and ACP Skills script; and every current addon/preferences locale catalog.

Extend the existing ACP Chat, ACP Skills compatible runner, SkillRunner dialog model, preference UI, Assistant UI smoke, persistence governance, and DOM identity tests. Do not create parallel low-value snapshot tests when an existing behavioral suite owns the invariant.

## Risks / Trade-offs

- [Silent content is intentionally unrecoverable from transcript] → State this in Preferences help; never imply switching modes can backfill it. Detailed audit remains independently governed.
- [A mode switch can split one backend message] → Seal the old visible segment on entry and discard the silent candidate on exit; never merge across policy epochs.
- [Terminal detection differs across products] → ACP Chat uses prompt settlement, ACP Skills uses validated final envelope/run state, and SkillRunner uses `assistant_final`; all share the same critical interaction categories.
- [A count update could rebuild panel chrome] → Keep progress out of chrome keys and lock every shared managed-region DOM identity in tests.
- [In-flight workspace scans can finish after entering silent] → Recheck mode and prompt identity before publishing any result.
- [Preference migration could create two authorities] → The old boolean is read only when the new enum is invalid; once a valid enum exists it is the only source.
- [Sparse transcripts change count/index expectations] → Suppressed events do not increment transcript metadata; progress is a separate ephemeral DTO.

## Migration Plan

Ship the new string preference and normalization fallback in one release. Existing `true` users begin in `live`; existing `false` users begin in `boundary`. No transcript or index migration runs. Rollback ignores the new preference and leaves historical/sparse transcript files valid because their schema is unchanged. Pending buffered writes from the previous mode are flushed at the transition boundary before silent suppression begins.

Implementation proceeds test-first by layer: preference/policy, shared ACP segmentation, ACP Chat, ACP Skills/workspace observation, SkillRunner, then UI/DOM guards. Focused tests and type/localization/lint checks run before the broader core/UI suites.

## Open Questions

None. Product semantics, transition behavior, message-count scope, ACP Chat final selection, and control presentation are fixed by this design.
