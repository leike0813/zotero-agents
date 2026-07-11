## 1. Execution Display Policy

- [x] 1.1 Replace the boolean preference tests with failing table-driven tests for `live`, `boundary`, and `silent`, invalid-value normalization, old boolean mapping, synchronous observer deduplication, and external preference writes.
- [x] 1.2 Implement `assistantExecutionDisplayPolicy.ts`, add the string preference/type/hook event, migrate imports, and remove the old streaming preference and thin publish-policy modules.
- [x] 1.3 Add failing host/read-model tests for the `executionDisplayMode` snapshot field and `set-execution-display-mode` action, then remove the old `streamingRenderEnabled` contract from all three panels.

## 2. Shared ACP Segmentation and Progress

- [x] 2.1 Add failing table-driven tests covering consecutive assistant chunks, thought transitions, tool/plan/user/turn boundaries, soft tool/usage/session side channels, empty chunks, terminal take, reset, and owner release.
- [x] 2.2 Implement `acpExecutionProgress.ts` and extend `acpTranscriptBoundary.ts` so ACP Chat and ACP Skills share one backend-agnostic semantic segmentation classification.
- [x] 2.3 Add diagnostics tests proving progress is memory-only and does not change transcript page totals, event sequences, indexes, or buffered-writer pending entries.

## 3. ACP Chat Silent Data Flow

- [x] 3.1 Add failing ACP Chat tests proving silent message/thought/tool/plan/metadata streams do not mutate mirror metadata, enqueue transcript writes, publish chunk snapshots, or leak into selected pages.
- [x] 3.2 Add failing ACP Chat tests for semantic count updates, permission/auth/waiting and terminal status visibility, final last-segment selection, abnormal terminal error state, and empty-candidate completion.
- [x] 3.3 Implement silent gating in `acpSessionManager.ts` before transcript projection/persistence and expose owner progress through `acpChatPanelReadModel.ts` without synthesizing pagination items.
- [x] 3.4 Add failing transition tests for sealing an old-mode active row on silent entry, retaining history, discarding the silent candidate on exit, and never backfilling omitted content; implement the shared external/local preference transition path.
- [x] 3.5 Verify prompt settlement uses the existing owner-scoped transcript durability barrier and performs at most the allowed terminal item/status writes.

## 4. ACP Skills Silent Data Flow

- [x] 4.1 Add failing run-store tests proving silent chunks, thoughts, tools, plans, usage, workspace activity, and ordinary statuses do not create transcript events, metadata increments, soft run persistence, or transcript UI changes.
- [x] 4.2 Add failing output tests proving invalid/pending revisions remain separate evidence, only the validated final envelope becomes an assistant transcript item, and user/permission/waiting/terminal/apply outcomes remain eligible.
- [x] 4.3 Implement silent gating and the named critical-stage allowlist in `acpSkillRunStore.ts`, including progress-only change publication and silent turn-boundary cleanup.
- [x] 4.4 Add failing orchestrator tests for no initial activity scan/timer in silent mode, immediate timer removal on entry, in-flight result discard, active-prompt restart on exit, recovered-session behavior, and cleanup unsubscription.
- [x] 4.5 Implement mode-aware workspace observation in `acpSkillRunnerOrchestrator.ts` without changing prompt execution, validation, timeout, permission, recovery, cancellation, or audit behavior.

## 5. SkillRunner Silent Projection

- [x] 5.1 Add failing SkillRunner model tests proving assistant process entries are hidden, intermediate assistant messages count once, standalone finals count once, promoted/replaced finals do not double count, and user/interaction/critical states remain immediate.
- [x] 5.2 Implement per-run progress and silent conversation filtering in `skillRunnerRunDialog.ts`, reusing the existing final-promotion identity matcher and retaining foreground SSE observation.
- [x] 5.3 Add refresh-governance tests proving process events do not change visible transcript signatures or trigger snapshots while count increments and finals use transcript-only/critical publication respectively.

## 6. Three-Segment UI and Preferences

- [x] 6.1 Replace Preferences checkbox tests with failing tests for the synchronized three-choice control, input/change/click deduplication, reopening behavior, and preference hook payload.
- [x] 6.2 Add failing shared panel tests for radiogroup/radio semantics, click and Arrow/Home/End selection, selected-mode labels, and narrow-toolbar behavior.
- [x] 6.3 Implement the three-segment control in Preferences, shared panel model/renderer/CSS, Workspace host routing, and ACP Chat/ACP Skills/SkillRunner child snapshots.
- [x] 6.4 Replace live-render localization keys with mode labels/help text in every current addon/preferences locale and pass localization governance.

## 7. Transcript Region and DOM Identity

- [x] 7.1 Add failing ACP Chat, ACP Skills, and SkillRunner tests for an owner-scoped progress node that is not a transcript page item and is removed/replaced at terminal state.
- [x] 7.2 Implement same-owner progress-node reuse and a progress signature containing only owner, active state, count, and revision.
- [x] 7.3 Extend managed-region identity tests so count-only, suppressed process, loading, and terminal transitions cannot rebuild toolbar, banner, plan, hint, reply, context drawer, details drawer, or permission drawer, and cannot disturb focused inputs/open drawers.
- [x] 7.4 Audit every panel chrome render key and region signature to keep transcript revision, page signature, chunks, counts, prompting/log tails, and progress revision out of non-transcript keys.

## 8. Verification

- [x] 8.1 Run the focused preference, ACP boundary, ACP Chat, ACP Skills, SkillRunner, Preferences UI, shared renderer, persistence-governance, and DOM identity test files.
- [x] 8.2 Run `npx tsc --noEmit`, `npm run check:localization-governance`, and `npm run lint:check`; fix all change-related failures without broad formatting rewrites.
- [x] 8.3 Run `npm run test:node:core` and `npm run test:node:ui` and document any unrelated pre-existing failures.
- [x] 8.4 Run OpenSpec verification against proposal, design, delta specs, and this task list before archiving or syncing specs.
