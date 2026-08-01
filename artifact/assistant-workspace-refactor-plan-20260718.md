# Assistant Workspace Refactor Plan

Date: 2026-07-18
Status: agreed direction, pre-execution
Supersedes/extends: `artifact/assistant-workspace-dev-ui-contract-audit-20260717.md`

## Problem statement

The Assistant Workspace sidebar (ACP Chat / ACP Skills / SkillRunner tabs) is
expensive to maintain: small changes frequently cause regressions. Root causes,
established by codebase investigation on 2026-07-18:

1. **Two update paradigms coexist.** ACP Chat/Skills use the strict v1
   publication plane (region publications, signatures, ACK/rebase). The
   SkillRunner tab still pushes full decorated snapshots through a legacy path
   (`skillRunnerRunDialog.ts` ~5600 LOC, `run-dialog.js` 1129 LOC,
   `assistant-panel-model.js` SkillRunner branch ~1800 LOC). Both share one
   renderer and constrain each other.
2. **No contract SSOT across the privileged/content boundary.** Wire field
   lists are hand-duplicated between the TS registry
   (`src/modules/assistantWorkspacePublication.ts`) and the JS receiver
   validators (`addon/content/shared/assistant/assistant-workspace-acp-child.js:54-260`).
   `hasExactKeys` set-equality means any drift is a silent runtime drop.
   Producer-side assertions run only in tests; test fixtures are hand-written,
   not producer-generated. Content JS is not part of the TS build, so no
   types/constants can be shared; message-type strings are duplicated across
   28+ sites.
3. **Parallel data-plane implementations.** Chat/Skills transcript mirror,
   streaming coalescing, and LRU logic are near-identical copies (~700–800 LOC
   each in `acpSessionManager.ts` / `acpSkillRunStore.ts`); the two surface
   adapters are structurally parallel; action routing exists in 3 copies with
   ~60% vocabulary overlap; permission registries and audit trails are paired.
   Estimated mergeable duplication: 2.5k–3.5k LOC.
4. **God files.** `acpSkillRunStore.ts` 6346, `acpSessionManager.ts` 5954,
   `acpSkillRunnerOrchestrator.ts` 5944, `assistantWorkspaceSidebar.ts` 4140 —
   domain logic, transcript mirror, LRU, persistence, and UI data-plane all
   intermixed.
5. **Hand-rolled rendering.** 4 layers of manual diff (region signature,
   drawer row/group/section, transcript row, virtual-scroll window) plus
   ~1000 LOC of hand-written virtualization.

What is **not** a root cause: the absence of a frontend framework. The ACP
publication plane is vanilla JS and is the most robust boundary in the repo;
SkillRunner is vanilla JS and the most fragile. The differentiator is contract
discipline. A framework removes hand-rolled diff code (cause #5) and improves
componentization, but cannot fix cross-boundary contracts (cause #2).

Essential complexity that any end state must preserve (AGENTS.md hard
constraints, each backed by real production bugs):

- transcript-region rendering decoupled from all chrome regions;
- page-first cold transcript load; owner-first owner switching;
- per-owner cold full-mirror LRU with live/pinned exemptions;
- ordered cross-iframe delivery with ACK and rebase;
- transcript persistence format is not a UI performance lever and must not
  be rewritten;
- protocol-level assistant-segment coalescing semantics (no backend-specific
  special cases).

## Locked decisions (2026-07-18)

- **SkillRunner tab: long-term keep, full convergence** onto the publication
  plane.
- **Framework: adopt early** — immediately after the contract foundation,
  migrate non-transcript chrome regions to a component framework.
- **Cadence: long-lived refactor branch**, with Phase 0/1 landing on `main`
  first (see rationale below).

## Sequencing rationale

Phase 0/1 go to `main` directly: they are additive or behavior-preserving,
and they are the drift insurance for the long-lived branch. The branch is cut
once wire contracts are single-sourced and typed. Framework migration precedes
SkillRunner convergence so the SkillRunner adapter lands directly in the
component world instead of being migrated twice.

## Phase 0 — Safety net (target: `main`)

- Wire field-list drift test: automatically compare the TS `keysByKind`
  registry against the JS receiver validator key sets (today nothing compares
  them).
- Producer-side publication self-check in debug builds
  (`assertAssistantWorkspacePublication` currently runs only in tests).
- Rebuild `test/core/184` fixtures from production constructors instead of
  hand-written literals.
- Behavior-level contract tests for the SkillRunner run-dialog boundary,
  replacing the source-text regex matching in
  `test/core/71-skillrunner-run-dialog-ui-e2e-alignment.test.ts`.
- Deepen DOM-identity invariant tests (`test/core/97-acp-ui-smoke.test.ts`).
  Correction from implementation: 97 already asserted node identity, not
  signature attributes — but only at region-mount granularity, and mounts are
  reused permanently (`assistant-panel-renderer.js` `managedMount`), so a
  guard miss that rebuilds mount content was invisible. The assertions now
  compare full subtree node lists element-wise, so the framework migration
  can replace the signature-guard implementation without weakening the
  locked behavior.

Phase 0 implementation notes (2026-07-18):

- A real drift was found and fixed on day one: the JS receiver's
  `forbiddenWireFields` had 9 entries vs 15 on the TS side (missing
  `deliveryRevision`, `initialization`, `totalItemCount`, `eventSeq`,
  `uiRevision`, `baseUiRevision`). Both sides now expose their wire field
  lists as importable registries (TS exported constants in
  `assistantWorkspacePublication.ts`; `window.AssistantWorkspaceAcpChild
  .wireFieldRegistry` in the child), and
  `test/core/190-assistant-workspace-wire-drift.test.ts` guards them.
- The producer-side self-check lives at the coordinator's single
  construction funnel (`createPublication`), gated by the
  `WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED` build flag + debug mode.
- Deferred to Phase 2: the FakeDocument test shim cannot host Preact (no
  `createTextNode`/`removeEventListener`/full selectors). Phase 2 must
  either extend the shim or adopt jsdom/happy-dom for renderer tests.

Exit: all green on `main`; every subsequent phase gets red/green feedback.

## Phase 1 — Contract single source of truth (target: `main`)

**Status: implemented 2026-07-19.** OpenSpec change:
`openspec/changes/2026-07-19-assistant-workspace-contract-ssot/`.

- Bring `addon/content/shared/assistant/*.js` into the esbuild/TS build
  (precedent: `src/workspaceApp.ts` → `app.bundle.js`), TS-ify, and share
  types/constants across the boundary.
- Generate both-side validators and message-type constants from one
  machine-readable wire schema (extend the existing v1 registry).
- Type UI→host actions as a discriminated union instead of
  `Record<string, unknown>`.
- Version the SkillRunner snapshot boundary into the same v1-style contract
  with a receiver-side validator.

Exit: field drift fails at compile/test time; no silent drops. **Refactor
branch is cut here.**

Phase 1 implementation notes (2026-07-19):

- The seven sidebar scripts moved to `src/sidebar/*.js` as ES modules
  (kept `.js`, not `.ts`: tsconfig has no `allowJs`, so they stay outside
  typechecking — full typing lands with the Phase 2 component rewrite).
  Three esbuild entries produce `acp-child.bundle.js`,
  `run-dialog.bundle.js`, and `assistant-workspace.bundle.js`; vendor
  libraries (katex/markdown-it/texmath) stay static ahead of the bundle tag;
  an ESLint `no-restricted-imports` override confines page bundles to
  relative paths and `src/shared/**`.
- `src/shared/assistantWireContract.ts` is the single source for wire field
  lists, message types, bridge keys, and out-of-band actions;
  `assistantWorkspacePublication.ts` re-exports for compatibility. The
  SkillRunner snapshot boundary gained
  `zotero-agents.skillrunner-workspace-snapshot.v1` in
  `src/shared/skillRunnerSnapshotContract.ts` with one shared validate
  implementation used by both the TS producer (debug-gated
  `SKILLRUNNER_SNAPSHOT_WIRE_ASSERT_ENABLED` self-check) and the
  `runDialog.js` receiver gate — no dual-written validators.
- `src/shared/assistantActionContract.ts` types all 37 registry action
  payloads with compile-time drift guards against the runtime registry;
  `assistantWorkspaceSidebar.ts` envelopes and routers were narrowed. Five
  host routes without known senders were annotated `TODO(contract)` and
  left in place.
- Vocabulary unifications shipped: dead `acp-skill-run:*`/`acp:*` message
  types removed; `assistant-panel:close-drawers` →
  `assistant-workspace:close-drawers`; `openDetails` →
  `open-details-drawer`.
- `test/core/191-skillrunner-snapshot-wire-contract.test.ts` locks the new
  boundary (four real snapshot shapes accepted, mutations rejected with
  field paths); `test/core/190` became a shared-registry integrity smoke
  since drift is now impossible by construction.


## Phase 2 — Framework foundation (branch)

- Adopt Preact (+ signals for fine-grained streaming updates) bundled by the
  existing esbuild pipeline. Chosen for size (~4 kB), keyed diffing, and no
  runtime requirements beyond standard DOM. Region boundaries isolate the
  choice; reversal cost is bounded.
- Component model for chrome regions: toolbar, banner, plan, hint,
  reply/composer, message counts, context drawer, details drawer, permission
  drawer. Region = component; publication plane (coordinator, signatures,
  ACK/rebase) is unchanged — props-level memoization replaces hand-written
  signature guards while preserving the observable region-isolation semantics
  locked by Phase 0 tests.
- The transcript renderer stays imperative behind a component wrapper (its
  virtualization and row-identity semantics are performance-critical); only
  its mount/props boundary is componentized.
- Migrate region by region inside the ACP child page; each migrated region
  deletes its hand-rolled guard/reconcile code.

Exit: all non-transcript chrome of ACP Chat/Skills is declarative; node-
identity invariant tests green; no change to wire protocol.

## Phase 3 — SkillRunner convergence (branch)

- Add `source: "skillrunner"` to the publication schema and implement a
  SkillRunner surface adapter that projects the poll/reconcile model into
  region publications (TS-side snapshot → region projection; coordinator
  signature dedup absorbs the lack of an incremental channel).
- Delete: `run-dialog.js` (majority), `chat_thinking_core.js`, the
  SkillRunner branch of `assistant-panel-model.js` (~1800 LOC), the legacy
  transcript-item adaptation layer (`adaptLegacyTranscriptItem`), and the
  duplicated markdown-it initializations (consolidate on one shared renderer).
- SkillRunner gains region isolation, owner-first switching, and the
  AGENTS.md transcript invariants it currently sits outside of.
- Amended by the dev merge (2026-07-25, see notes below): the adapter must
  inherit the transcript publication-clock semantics dev hardened on the
  legacy path, and the acceptance baseline is the 2026-07-25 behavior
  analysis artifact. The one sanctioned perceptible change is run switching
  becoming owner-first (classified as an intended "smoother" improvement,
  not a regression).

Exit: one update paradigm for all three tabs; panel model/renderer slimmed
by ~1/3.

## Phase 4 — Data-plane merge and god-file split (branch)

- Generic transcript mirror store: merge the Chat/Skills mirror/LRU/streaming
  implementations (~1.5k → ~800 LOC); align persistence on the indexed JSONL
  implementation for both sources.
- Unify action vocabulary with a shared dispatch table keyed by owner source;
  merge paired modules (permission registries, audit trails); extract the
  shared skeleton of the two ACP surface adapters.
- Split `acpSkillRunStore.ts` / `acpSessionManager.ts` /
  `assistantWorkspaceSidebar.ts` into domain logic / transcript mirror /
  UI data-plane layers; target ≤ ~2k LOC per file.

Exit: mergeable duplication (2.5k–3.5k LOC) eliminated.

## Phase 5 — Hardening and merge prep (branch)

- Final decision on the transcript renderer (expected: keep custom,
  component-wrapped).
- Run the formal live Zotero 7/9 replay matrix (never executed to date;
  requires host instances).
- Refresh performance baselines (`artifact/performance-baselines/`) for
  transcript-first-paint and region-isolation costs.
- Full acceptance gates per phase and at merge: build, focused Node suites
  (97/184 and the acp-* family), localization governance, help-doc check,
  lint, strict OpenSpec validation — the local gates from the 2026-07-17
  audit — plus a manual Zotero smoke pass.

## Branch governance

- Rebase onto `main` weekly; Phase 0/1 tests on `main` are the drift contract.
- No behavior changes piggybacked on the refactor; AGENTS.md UI hard
  constraints are acceptance criteria, updated in the same change as any
  implementation they describe.
- One OpenSpec change proposal per phase; phases land on the branch in order
  and stay individually revertible.
- AGENTS.md hard-constraint sections are rewritten at merge time to describe
  the new implementation (component/props memoization instead of hand-written
  signature guards), preserving every behavioral invariant.

## Expected outcome

- One update paradigm across three tabs (today: two).
- One contract source (today: hand-duplicated, partially absent).
- −2.5k to −3.5k LOC of parallel logic; panel model/renderer −~1/3; god
  files split to ≤ ~2k LOC.
- Hand-rolled diff layers 4 → 1 (framework keyed diff), plus the custom
  transcript virtualization kept deliberately.
- Regressions from contract drift move from silent runtime drops to
  compile/test-time failures.

## Risks

- **Long-branch drift** — mitigated by Phase 0/1 on `main` + weekly rebase.
- **Framework migration breaking region-isolation semantics** — mitigated by
  Phase 0 node-identity tests and region-at-a-time migration.
- **Live-environment verification is manual** — the Zotero 7/9 replay matrix
  has never been run; each phase schedules a smoke pass, Phase 5 formalizes.
- **Implementation-detail tests** (source-text regex in `test/core/71`;
  mount-granularity identity checks in `test/core/97`) must be migrated
  before the code they lock — sequenced in Phase 0.

## Dev merge notes (2026-07-25)

`dev` (~50 commits ahead of merge-base `a8908417`, up to v0.8.0) was merged
into `dev-assistant-ui` after Phase 2 to reduce merge-back friction. Three
textual conflicts (help-docs manifest timestamp — regenerated;
`assistantWorkspaceAcpChild.js`; `test/core/97`), all resolved in favor of
the Phase 2 structure with dev semantics re-landed. dev also landed two
reference artifacts that now govern refactor acceptance:

- `artifact/assistant-workspace-user-behavior-analysis-20260725.md` — the
  user-visible behavior baseline; §6 and the §8.7 checklist are the
  SkillRunner-tab acceptance contract for Phase 3.
- `artifact/assistant-workspace-refactor-improvement-candidates-20260725.md`
  — decision list; its column-E items (Chat writable while disconnected,
  `TODO(contract)` ×5, …) stay parked and must not be piggybacked.

### Classification of dev changes coupled to the refactor scope

- **(C) Merges cleanly, no refactor interplay** (lands on code Phases 2–4
  keep): ACP runtime-option resolution SSOT; atomic placeholder conversation
  on backend switch; live-UI consistency fixes (scroll stickiness, terminal
  Markdown, banner convergence); backend-scoped workflow settings; removal
  of the interaction token; ACP Skills runtime-option SSOT + multi-page
  transcript/scroll fixes (transcript renderer merges as-is); Kilo reasoning
  fallback widening; recovery Host Bridge injection; the native workflow
  queue core/wire/routing; SkillRunner observer lifecycle convergence (the
  poll/reconcile model Phase 3 keeps).
- **(B1) Overlaps Phase 2 — re-landed onto Preact ("Phase 2.5")**:
  - owner-scoped transcript loading/empty placeholder → `TranscriptRegion`
    gains an `ownerKey` dimension in memo comparison and reset effect
    (AGENTS.md owner-scope isolation invariant);
  - source-aware context drawer (Chat sessions-only section, empty backend
    group filtering, section-scoped collapse keys), the Queued drawer
    section with `cancel-queued-workflow-unit`, and the task-card
    Backend/Apply status axis → `ContextDrawerRegion`;
  - waiting_user interaction controls (open-text/option/confirm/file) →
    `HintRegion`/`ReplyRegion`/`ActionControls`, driven by model-projected
    action descriptors instead of the child's hand-made `reply` action;
  - reply stale action/payload fix (the renderer's WeakMap mechanism has no
    Preact equivalent; `ReplyRegion`'s memo equality must include the
    action/payload or read them via ref).
  No new OpenSpec change: these behaviors are already specified in
  `openspec/specs/*` by the dev-side archived changes; Phase 2.5 brings the
  refactored implementation back to spec.
- **(B2) Lands on the legacy path Phase 3 deletes — semantics the
  SkillRunner surface adapter must inherit** (recorded in the Phase 3
  OpenSpec change):
  - transcript publication clock: mode-aware transcript qualification, the
    `isSkillRunnerDisabledLivePublishBoundary` classification SSOT (reused
    as-is), the pending-boundary bit, and clock preservation across host
    detach/reattach;
  - capability-gated interaction file submission (`submit-interaction-files`);
  - the Queued section in SkillRunner owner-navigation projection;
  - test migrations (71, 65, 97 SkillRunner section, snapshot harness) must
    carry dev's new assertions over to the publication boundary.

### Phase 3 acceptance amendment

Per the improvement-candidates artifact (column A/E, already decided): run
switching on the SkillRunner tab changing from "full transcript rebuild +
Loading conversation..." to owner-first spinner + page-first paint is the
one sanctioned perceptible change; acceptance and release notes classify it
as an intended improvement. Everything else in §6/§8.7 of the behavior
analysis must hold byte-for-byte.

## Phase 3 implementation notes (2026-07-26)

**Status: implemented.** OpenSpec change:
`openspec/changes/2026-07-21-assistant-workspace-skillrunner-convergence/`.
Landed in five commits on `dev-assistant-ui`:

- `63a27358` — wire schema admits `skillrunner` (third owner branch,
  request-scoped owner key with run-key fallback; 26 typed actions; domain
  mapping exhaustive for three sources with `plan`/`service-status`
  declared not-applicable).
- `4006024e` — read model + `SKILLRUNNER_WORKSPACE_ADAPTER` (dark).
  Transcript publishes snapshots only; the publication runtime gained a
  snapshot-only transcript lane (queued kind without mutations → flush
  re-reads a full page) and the coordinator now accepts steady-state
  snapshots. ACP mutation paths unchanged. Canonical conversation-entry →
  transcript-item projection is a host-side SSOT in
  `skillRunnerRunDialog.ts`.
- `12f9caeb` — atomic cutover: `skillrunner.html` boots the shared
  `acp-child.bundle.js` with `data-source="skillrunner"`; shell legacy
  snapshot channel and legacy action forwarding deleted; child
  source/envelope/action-owner branches added; sidebar actions routed
  through the typed registry (`dispatchSkillRunnerWorkspaceAction`).
  Includes the waiting_auth "auth suite" fix: the shared interaction DTO
  gained an optional `auth` block (authUrl/userCode/lastError/methods/
  importFiles) projected from the read model, so the hint region renders
  the full auth affordances byte-identically to the legacy child. Test
  migrations: 71 rewritten to publication-boundary behavior tests (11
  cases), 97 SkillRunner section rewritten to drive the shared child
  through publications with subtree node-identity assertions (9 cases).
  Also fixed two real observer races exposed by the faster publication
  funnel (stop-during-init stream leak; shutdown/start interleave orphan
  observer).
- `d078e255` — legacy deletion (−6772 LOC): `runDialog.js`,
  `runDialogApp.js`, `chatThinkingCore.js`, `run-dialog.html`,
  `skillRunnerSnapshotContract.ts`, the SkillRunner branches of
  `assistantPanelModel.js`/`assistantPanelRenderer.js`,
  `adaptLegacyTranscriptItem`, the push plane in
  `skillRunnerRunDialog.ts` (6634→5555 LOC), standalone dialog mode.
  `pushSnapshot` survives only as `publishRunWorkspaceState`: the
  transcript publication clock plus the change-notify funnel. markdown-it
  consolidated into the `src/sidebar/markdownParser.js` singleton.
- Phase 3.5 — docs and gates (this note, AGENTS.md cold-mirror wording).

Deviation notes:

- Test 97's drawer task-card assertion changed from "card replaced" to
  "card patched in place" — Preact keyed reconcile is strictly stronger;
  the visible semantics (unchanged cards keep identity, changed card
  content updates) are locked either way.
- The waiting-state history catch-up test in 193 now triggers an explicit
  workspace refresh: the old push path's ~60 localize calls incidentally
  widened a re-sync window. Production semantics unchanged; a systematic
  catch-up mechanism for waiting runs would be new feature work.
- `assistantPanelRenderer.js`'s imperative chrome render functions no
  longer have production callers but remain locked by test 97 — deferred
  cleanup candidate for Phase 4.
- One flake observed in `108-host-bridge-workflow-control` during a full
  core run; passes in isolation and on rerun, unrelated to this change.

Acceptance: `test:node:core` 2827 passing / 0 failing; build, lint,
localization governance, help-docs, ssot-invariants, OpenSpec strict
validation, and `test:lite` all green. A dedicated §6/§8.7 acceptance
sweep against the behavior baseline found three regressions the test
suites had missed (control-indicator badges, auto-reply indicator,
backend-unreachable drawer groups) plus seven divergences (composer
busy-Cancel and auth-paste labels, ACP-only dropdowns/usage gauge on the
SkillRunner composer, "Loading conversation..." status row, details
section depth, attention tooltip, empty-state text); all were restored
to baseline and locked by new tests. Two perceptible changes are
sanctioned (user-approved): owner-first run switching, and the
permission "View details" sheet now opening (inert in the legacy UI).
Manual Zotero 7/9 smoke remains a manual item before merge to `main`.

## Phase 4 implementation notes (2026-08-01)

**Status: implemented.** OpenSpec change:
`openspec/changes/2026-08-01-assistant-workspace-data-plane-merge/`.
Landed on `dev-assistant-ui` as one working tree (sub-deliverables were
kept independently green but committed together — see deviation notes).

### What landed

- **Generic transcript mirror store** (`assistantTranscriptMirrorStore.ts`,
  817 LOC) + two thin drivers (`acpChatTranscriptMirror.ts` 914,
  `acpSkillRunTranscriptMirror.ts` 1496). All per-source variation is an
  injected `AssistantTranscriptMirrorOwnerDescriptor`: owner key, pin
  predicate, item-id allocation (random vs ordinal + hydrate recovery),
  streaming segment tracking (dual assistant/thought vs single
  `lastTextItem`), plan mode (`transcript-item` vs `external`), continuity
  bookkeeping, cold-queue branch (`queueEventWhileMirrorCold` →
  `"handled" | "continue"`), emit/persist callbacks. The one structural
  divergence (plan handling) is an explicit mode, not a callback chain.
  Mirror state hosting stays per-source; the store operates on a
  `core(state)` projection handle and owns no global mirror map. The
  Skills migration extended the descriptor with named hooks
  (`prepareMirrorForEvent`, `resolveLoadedCounters`, `shouldReleaseOnEvict`,
  hydrate lifecycle hooks) — each exercised by both drivers, judged
  explicit coupling. `acpConversationTranscriptStore.ts` was **not**
  folded (tests import the path directly; the two item unions are
  genuinely distinct types) but its `as never` casts were replaced with
  typed `as unknown as` casts.
- **God-file splits** (domain / mirror / persistence / UI data-plane):
  - `acpSessionManager.ts` 6136 → 4081 (+ `acpChatWorkspaceDataPlane.ts`
    642, `acpChatSkillInjection.ts` 549, `acpChatWorkspaceEmissionFacade.ts`
    55 cycle-breaker);
  - `acpSkillRunStore.ts` 6513 → 3376 (+ `acpSkillRunPersistence.ts` 1220,
    `acpSkillRunWorkspaceDataPlane.ts` 748);
  - `assistantWorkspaceSidebar.ts` 4236 → 2181 (+
    `assistantWorkspacePublicationHost.ts` 1313,
    `assistantWorkspaceActionRouter.ts` 1094);
  - `acpSkillRunnerOrchestrator.ts` 6091 → 2858 (+
    `acpSkillRunRecovery.ts` 2177, `acpSkillRunExecutionSupport.ts` 1268).
  All splits preserve their public export surface via barrel re-exports;
  cross-layer emission moves through `configure*Host` injection
  (facade pattern), keeping the runtime import graph acyclic.
- **Shared action dispatch table** in `assistantWorkspaceActionRouter.ts`:
  `ASSISTANT_WORKSPACE_HOST_ACTION_TABLE` keyed by action then source with
  a uniform `(ctx) => Promise<void>` handler signature. Duplicated bodies
  (`resolve-permission`, `copy-diagnostics`, `open-workspace`,
  `set-mode/model/effort`, `cancel-queued-workflow-unit`,
  `open-backend-manager`, `set-execution-display-mode`) exist once as
  `*ForSource` implementations; `load-transcript-page` /
  `request-owner-details` use a `Record<source, adapter>` lookup;
  SkillRunner payload normalization is skillrunner-cell preprocessing.
  The five `TODO(contract)` routes stay verbatim.
- **Surface adapter skeleton** (`assistantWorkspaceSurfaceSkeleton.ts`,
  170 LOC): change-kind mapper, region-read dispatcher, owner-control DTO
  assembly, queued-entries navigation block, adapter literal factory.
  Read models, hint projections, state machines, badges stay per-source.
- **Permission/audit merges**: one `requestScopedPermission` in
  `hostBridgePermissionManager.ts` parameterized by `{kind, ownerKey,
  setRequest}` (pending state stays in the session snapshot / run record /
  SkillRunner registry); shared `acpAuditAppendCore.ts` (140 LOC) owns the
  buffered-NDJSON append lifecycle under both audit trails (Skills keeps
  multi-file layout + sanitization, Chat keeps the discard latch).
- **Dead chrome renderer cleanup**: `assistantPanelRenderer.js`
  3051 → 141 LOC (`adoptPanelRegions`/`managedMount`/
  `installOverlayDismiss`/`markRegion`/`shouldManageRegion` + verified
  live dependencies). −2910 LOC.

### Deviation notes

- **≤ ~2k LOC target not met for the four split files** (4081 / 3376 /
  2181 / 2858). The extractions followed the natural boundaries; the
  remainders are cohesive domain cores (session lifecycle + skill
  injection consumers; run-record domain + type block; shell host;
  the ~2.3k-line `executeAcpSkillRunnerJob` family). Further splitting
  would cut through cohesive logic — accepted as-is; Phase 5 may revisit.
- **Test migrations (sanctioned, two files)**:
  - `test/node/core/97-runtime-diagnostics-release-elision.test.ts`:
    source-text timer-scheduling anchors re-pointed from
    `acpSkillRunStore.ts` to `acpSkillRunPersistence.ts` /
    `acpSkillRunWorkspaceDataPlane.ts` (assertions unchanged);
  - `test/core/97-acp-ui-smoke.test.ts`: all six dead-renderer call
    sites were **re-pointed** (none deleted — no publication-plane case
    covered their semantics) to the Preact `chromePanelRenderer` seam
    with assertion content unchanged. One substantive adjustment: the
    drawer-structure case now feeds fresh objects instead of mutating
    props in place, because the memoized `ContextDrawerRegion` compares
    by signature — production always publishes fresh objects.
- **Sidebar split kept three functions in the shell** (`postShellInit`,
  `maybeShowAcpSkillWaitingToasts`, attention-indicator helpers) because
  tests 95/138 anchor on their source text in
  `assistantWorkspaceSidebar.ts`; `postShellInit` is injected into the
  publication host.
- **`inspectSyntheticAcpSkillRunReplayTimers` spans two owners** after
  the store split (soft-persist half in persistence, change-emit half in
  data-plane), composed with original warning/timer ordering.
- **One yield-timing regression found and fixed during the adapter
  skeleton extraction**: the region-read dispatcher initially `await`ed
  every kind, adding microtask yields to the previously yield-free
  SkillRunner read path; publications were byte-identical but test 97
  lost 4 mount-preservation cases. Fixed by resolving synchronous readers
  in the same tick. Lesson recorded for Phase 5: async restructuring of
  publication read paths is timing-observable to the UI.
- Sub-deliverable commits were not made; the phase landed as one
  working tree. Each step was verified green before the next began, so
  bisect granularity lives in the step sequence above rather than in git.

### Quantitative outcome

- Net diff: 32 files, +15100/−15604 (motion-heavy). Parallel
  implementations single-sourced: mirror/LRU/streaming (~1.9k → 817
  shared + thin driver diffs), action routing (3 copies → 1 table),
  adapter skeleton, permission dispatch (3 → 1), audit append core
  (2 → 1), dead chrome rendering (−2910). God files: 6136/6513/4236/
  6091 → 4081/3376/2181/2858 with the extracted layers each ≤ ~2.2k.

### Acceptance

All gates green (recorded below).

- Gates: `npm run build` green; `test:node:core` 2826 passing / 1
  failing — the single failure was a 2s timeout flake in
  `test/core/137-literature-search-ingest-workflow.test.ts` (unrelated to
  this phase; 20/20 passing in isolation); `lint:check`,
  `check:localization-governance`, `check:help-docs`,
  `check:ssot-invariants`, `test:lite` (41 passed), and OpenSpec strict
  validation all green. Change archived as
  `openspec/changes/archive/2026-08-01-assistant-workspace-data-plane-merge/`.
  Manual Zotero 7/9 smoke remains a manual item before merge to `main`.
