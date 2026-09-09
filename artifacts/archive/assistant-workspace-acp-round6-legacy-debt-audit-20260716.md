# Assistant Workspace ACP Round6 Legacy Debt Audit

Date: 2026-07-16

## Implemented boundaries

- The ACP publication wire contract is strict v5 with one exhaustive region
  registry, exact envelopes, exact owner shapes, bounded renderer failures, and
  no v4 kind or alias decoding.
- `assistantWorkspacePublicationRuntime.ts` owns the shared adapter contract,
  inactive/owner guards, ordered initialization, owner-first loading, page
  publication, batch region reads, and rebase behavior.
- Chat and Skills publication adapters read minimal owner models. Task Manager
  no longer constructs ACP Skills panel snapshots, and copy-diagnostics uses a
  dedicated diagnostics DTO.
- The browser receiver stores canonical `navigation`, `services`, and
  `selection` state and atomically replaces every owner-owned region when
  navigation selects another owner.
- The profiler uses a post-owned lifecycle ledger. Correctness evidence
  survives metric-series overflow, rejected/out-of-window ACKs are bounded and
  retained, and terminal outcome is first-write-wins.
- Replay reports execution completion, measurement completion, and acceptance
  separately; R3 counts are derived from the lifecycle ledger.
- Source-specific ACP CSS and the former shared v4 surface helper were removed.
  Both ACP documents load the shared child CSS, receiver, bridge, and message
  envelope.

## Removed production debt

- The source-specific ACP child JS/CSS files and the former conversation-view
  helper are deleted. Both ACP documents now load one shared child and one
  exact `projectAssistantWorkspacePanel(state, uiState, labels)` path.
- The shared child no longer owns panel render keys, transcript node maps,
  transcript revisions, page signatures, or source-specific fallback
  projection.
- Chat no longer maintains frontend/panel UI snapshots or their revision and
  unpublished-transcript flags. Workspace changes are immutable typed events.
- Skills no longer exposes panel snapshot types/builders. Workspace consumers
  use the minimal read model, transcript-region reader, and diagnostics DTO.
- The shared publication runtime owns the 16 ms intent coalescer, guards,
  batching, initialization, rebase, post, ACK, lifecycle, and owner-lane
  cleanup for both sources.
- SkillRunner retains only its independent transport projector boundary and
  uses the shared panel renderer after that conversion.

## Deletion targets

- `src/modules/assistantWorkspaceAcpSurface.ts`
- `src/modules/acpChatPanelReadModel.ts`
- `addon/content/sidebar/acp-chat.js`
- `addon/content/sidebar/acp-skill-run.js`
- `addon/content/sidebar/acp-chat.css`
- `addon/content/sidebar/acp-skill-run.css`
- `addon/content/shared/assistant/assistant-conversation-view.js`
- `createPanelPresentation()` and source-specific ACP panel projector fallbacks
- ACP Workspace use of Chat frontend snapshots and Skills panel snapshots
- historical v3/v4, resync, matrix compatibility, and governance eligibility
  vocabulary from current production paths

## Preserved boundaries

- Transcript JSONL, index, mirror, pinned-live behavior, and cold mirror cache
- Indexed page read as the correctness path
- Chat conversation and Skills run storage schemas
- SkillRunner snapshot transport and projector boundary
- External APIs, preferences, and dependencies

## Zero-reference audit

The following current protocol and profiler vocabulary has zero production
references:

- `baseline-status`
- `context-details`
- `requiresResync`
- `governanceEligible`
- `postAcpSkillRunPublicationForPerformanceTests`
- `createPanelPresentation`

`reply-hint` remains only as an ordinary renderer CSS class, not as a
publication kind.

The browser/producer zero-reference gate is satisfied. Forbidden legacy browser
field names remain only in strict rejection lists and tests that prove they are
rejected. `activeConversationId` and `selectedRequestId` remain valid internal
selection variables in the persistent Chat/Skills stores; they do not appear
in canonical ACP browser state. SkillRunner snapshot fields remain isolated
from the ACP v5 publication contract.

## Verification evidence

- 33 shared UI/SkillRunner boundary tests passed.
- 12 strict v5 publication/runtime tests passed.
- 100 ACP Chat session-manager tests passed.
- 145 ACP SkillRunner-compatible runner tests passed.
- 34 background refresh and memory-governance tests passed.
- 59 profiler and Replay tests passed.
- 41 Host Bridge and Zotero 7–9 compatibility baseline tests passed.
- Two Zotero 9.0.4 runtime UI tests passed: production Chat/Skills
  target-active Replay and real nested Workspace frame publication.
- `npx eslint .` passed.
- `npm run build` passed, including TypeScript no-emit checking.
- `npm run check:help-docs` passed with no generated help-doc diff.
- `npm run check:localization-governance` passed.
- `npm run check:runtime-diagnostics-release-elision` passed with zero
  exclusive-module bytes for release and every source-disabled diagnostic
  group.
- `openspec validate repair-assistant-workspace-acp-presentation-and-replay-integrity --type change --strict`
  passed.
- `npm run lint:check` passed.
- Zotero 7 and the two-round recorded-cadence performance acceptance were not
  run because no Zotero 7 executable or recorded Replay fixture exists in this
  workspace. No bytes or drift claim is inferred from the synthetic runtime
  mechanism test.
