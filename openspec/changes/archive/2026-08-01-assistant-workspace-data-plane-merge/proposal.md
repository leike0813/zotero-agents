# Change: Assistant Workspace Data-Plane Merge And God-File Split

## Why

Phase 4 of the Assistant Workspace refactor
(`artifact/assistant-workspace-refactor-plan-20260718.md`). Phases 0–3 put
all three tabs on one publication plane with a single wire contract, but
the host-side data plane is still duplicated and concentrated in god
files:

- The ACP Chat (`acpSessionManager.ts`, 6136 LOC) and ACP Skills
  (`acpSkillRunStore.ts`, 6513 LOC) transcript mirror / cold-LRU /
  streaming-coalescing implementations are near-identical copies
  (~750–800 and ~1000–1100 LOC respectively) with parameterized
  differences only (owner key, pin predicate, item-id allocation,
  streaming segment tracking, plan handling, continuity bookkeeping).
- Host action routing exists in three per-source copies inside
  `assistantWorkspaceSidebar.ts` (4236 LOC) plus the SkillRunner chain,
  with ~60% vocabulary overlap and several byte-parallel handler bodies.
- The three surface adapters (`acpChatWorkspaceSurface.ts`,
  `acpSkillsWorkspaceSurface.ts`, `skillRunnerWorkspaceSurface.ts`) are
  55–65% shared skeleton (change-kind mapping, owner-control DTO
  assembly, owner-navigation builders, adapter literal).
- The permission dispatcher (`hostBridgePermissionManager.ts`) carries
  three copy-paste `request*ScopedPermission` functions; the two
  file-based audit trails duplicate the same buffered-NDJSON write core
  (identical overflow constants and policies).
- `acpSkillRunnerOrchestrator.ts` has grown to 6091 LOC with two
  multi-thousand-line function clusters (recovery, main execution).
- `assistantPanelRenderer.js` (3051 LOC) still carries ~2700 LOC of
  imperative chrome render functions that lost their production callers
  in Phases 2–3 and survive only through stale test references.

This duplication is the maintenance cost driver the refactor set out to
eliminate (Phase 4 exit: −2.5k to −3.5k LOC of parallel logic; god files
≤ ~2k LOC).

## What Changes

- **Generic transcript mirror store**: new
  `src/modules/assistantTranscriptMirrorStore.ts` holds the shared
  mirror/LRU/hydrate/page-read/streaming machinery once, parameterized by
  an injected owner descriptor (owner key, pin predicate, item-id
  allocator, streaming segment tracker, plan handling mode, continuity
  hooks, not-hydrated branch, emit/persist callbacks). ACP Chat and ACP
  Skills each keep a thin per-source driver
  (`acpChatTranscriptMirror.ts`, `acpSkillRunTranscriptMirror.ts`).
  Persistence is already aligned on the indexed JSONL store; the
  101-line chat adapter (`acpConversationTranscriptStore.ts`) is folded
  away if it becomes trivial.
- **God-file splits** along domain / transcript-mirror / UI-data-plane
  (and persistence) lines: `acpSessionManager.ts`, `acpSkillRunStore.ts`,
  `assistantWorkspaceSidebar.ts`, and `acpSkillRunnerOrchestrator.ts`
  each end ≤ ~2k LOC. Existing import sites are stabilized with barrel
  re-exports (Phase 1 precedent).
- **Shared action dispatch table** in a new
  `assistantWorkspaceActionRouter.ts`, keyed by action then owner source,
  collapsing the duplicated handler bodies (`resolve-permission`,
  `copy-diagnostics`, `open-workspace`, `set-mode/model/effort`,
  `cancel-queued-workflow-unit`, `open-backend-manager`,
  `set-execution-display-mode`). The action registry stays the vocabulary
  SSOT; the five `TODO(contract)` routes stay verbatim.
- **Surface adapter skeleton extraction**: the change-kind mapping
  machinery, owner-control DTO assembly, owner-navigation builder, and
  adapter literal factory move to a shared module; per-source read
  models, hint projections, and state machines stay per-source.
- **Permission/audit merges**: one parameterized
  `requestScopedPermission` in the permission manager (pending state
  stays where it lives today — snapshot-embedded for ACP, external
  registry for SkillRunner); one shared buffered-NDJSON audit write core
  under the two audit trails.
- **Orchestrator split**: recovery/continuation (~1.9k LOC) and
  execution support (prompt build, hard-timeout monitor, MCP preflight,
  permission wrap) move out of `acpSkillRunnerOrchestrator.ts`.
- **Dead chrome renderer cleanup**: `assistantPanelRenderer.js` keeps
  only `adoptPanelRegions`/`managedMount` and their live dependencies;
  the six stale test-97 call sites are adjudicated case by case
  (re-point to the Preact seam where the behavior is otherwise
  unlocked, delete where covered).

## Behavior Contract

This is a behavior-preserving refactor. Every AGENTS.md Assistant
Workspace / ACP Transcript Projection invariant holds: region isolation,
page-first cold load, owner-first switching, per-owner cold LRU with
live/pinned exemption, ACK/rebase ordering, unchanged transcript
persistence format, and protocol-level (never backend-specific)
coalescing. The existing test suites (96/107/171/184/190/193/97/71/95/
109 and the acp family) are the acceptance contract and are not modified
except for the six adjudicated dead-code call sites in test 97. Parked
improvement items (`TODO(contract)` routes, column-E candidates) are not
piggybacked.

## Out Of Scope

- SkillRunner transcript mirror (bounded in-memory 500-entry mirror with
  snapshot paging; no cold LRU by design).
- Any behavior change, wire protocol change, or persistence format
  change.
- The manual Zotero 7/9 replay matrix (Phase 5).
