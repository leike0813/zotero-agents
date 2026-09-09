# Assistant Workspace Refactor — Merge Prep

Date: 2026-08-07
Branch: `dev-assistant-ui` → target `main`
Plan: `artifact/assistant-workspace-refactor-plan-20260718.md` (Phase 5)
OpenSpec change: `openspec/changes/2026-08-07-assistant-workspace-hardening-merge-prep/`

## Per-phase gate summary

| Phase | Deliverable | Acceptance evidence |
| --- | --- | --- |
| 0 | Safety net (wire drift test 190, producer self-check, fixture rebuilds, node-identity tests) | Landed on `main` 2026-07-18; all green |
| 1 | Contract SSOT (`src/shared/assistantWireContract.ts`, sidebar bundles, typed action contract) | Landed on `main` 2026-07-19; all green |
| 2 | Framework foundation (Preact chrome regions, transcript component wrapper) | Branch; node-identity invariants green |
| 2.5 | dev-merge re-lands onto Preact (owner-scoped loading, context drawer, waiting_user controls, reply fix) | Branch; spec conformance restored |
| 3 | SkillRunner convergence (one update paradigm, −6772 LOC legacy deletion) | `test:node:core` 2827/0; §6/§8.7 baseline sweep restored; two sanctioned perceptible changes |
| 4 | Data-plane merge + god-file split (mirror store, action table, adapter skeleton, permission/audit merges, −2910 LOC dead renderer) | `test:node:core` 2826/1 (known unrelated flake in 137); all other gates green |
| 5 | Hardening + merge prep (this change) | See below |

## Phase 5 gate results (2026-08-07)

- `npm run build` — green (both `tsc --noEmit` configs).
- `npm run test:node:core` — 2827 passing / 0 failing / 62 pending.
- `npm run lint:check` — green.
- `npm run check:localization-governance` — green.
- `npm run check:help-docs` — green (513 docs).
- `npm run check:ssot-invariants` — green.
- `npm run test:lite` — 41 passed.
- OpenSpec strict validation — this change valid. NOTE: `openspec validate --all --strict` reports 9 pre-existing spec warnings (e.g. "Purpose section is too brief") unrelated to this refactor; they predate Phase 5 and are recorded here so merge review does not mistake them for regressions.
- Performance baseline refreshed:
  `artifact/performance-baselines/acp-runtime-after-workspace-refactor-*.{json,md}`
  with production-emitted `panel_signature*` (region isolation) and
  `transcript_page_*` (page-read / first-paint proxy) series. The
  double-run determinism gate passes. The 2026-07-18
  `acp-runtime-before-governance-*` files are retained untouched.
- Live Zotero 9 replay matrix: **executed** (seven matrices across four
  traces; two fresh traces recorded on the refactored build; accepted
  wherever the fixed byte budget is applicable; like-for-like boundary
  comparison shows no posted-bytes regression — 512,783 B pre-refactor vs
  508,717/508,756 B now). Full evidence:
  `artifact/performance-baselines/replay-matrices/`. Recorder edge cases
  not exercised (disconnect recovery, replacement-session notice,
  same-session reconnect binding) roll into the Zotero 7 pass. SkillRunner
  tab verified in the backend-unavailable state only; full lifecycle smoke
  needs a reachable SkillRunner backend.

### Gate fix discovered during Phase 5

The baseline recorder's double-run determinism gate was unpassable even on
unmodified HEAD: `beginHostHttpRequestRead` measures `Date.now()` wall
time, so R2 `host_input_duration` / `host_input_callback_max_duration`
were machine-scheduling-dependent (0–2 ms drift). Fixed in the harness by
freezing `Date.now` during the R2 seam; production code untouched.

## Open items before merge

1. **Zotero 7 replay matrix** — host not installed on the development
   machine; the Manual Zotero Acceptance procedure
   (`doc/components/acp-runtime-performance-profiler.md`) has been
   exercised on Zotero 9 only. Acceptance "remains pending until both
   hosts have been exercised" per the profiler doc.
2. **Zotero 7 manual smoke + remaining recorder edge cases** — the
   Zotero 9 pass covered the matrices, fresh recordings, and the cheap
   edge cases; disconnect recovery, replacement-session notice, and
   same-session reconnect binding were not exercised and should join the
   Zotero 7 pass. SkillRunner full-lifecycle smoke needs a reachable
   SkillRunner backend (only the backend-unavailable state was verified).
3. **AGENTS.md hard-constraint rewrite** — apply the draft below at merge
   time (branch governance: rewritten when the new implementation lands on
   `main`, not before).
4. **The merge itself** — requires explicit user authorization.

## AGENTS.md rewrite draft (apply at merge time)

Replace the mechanism wording of the "Assistant Workspace UI硬约束"
section. Every behavioral invariant is preserved; only the described
mechanism changes (Preact component props memoization with signature
equality replaces hand-written signature guards/reconcile code; the
hand-written region-diff layers were deleted in Phases 2–4).

Draft replacement for the two mechanism-coupled bullets:

- 原："如果需要刷新非 transcript region，必须使用该 region 自身的稳定
  signature，signature 只能包含该 region 用户可见内容和打开/折叠状态。"
  → 新："如果需要刷新非 transcript region，必须使用该 region 自身的稳定
  signature（只能包含该 region 用户可见内容和打开/折叠状态）作为组件
  props 的 memoization 比较键（`src/sidebar/components/regionEquality.ts`
  的 signature equality）；signature 语义不因实现机制变化而放宽。"
- 原："所有 Assistant Workspace shared managed regions（toolbar、banner、
  plan、hint、reply、context drawer、details drawer、permission drawer）
  都必须经由区域级 signature guard；不得让 transcript-only/loading/
  streaming snapshot 直接触发这些区域的 clear/rebuild。"
  → 新："所有 Assistant Workspace shared managed regions（toolbar、
  banner、plan、hint、reply、context drawer、details drawer、
  permission drawer）都是独立 Preact 组件，经由区域级 props
  memoization（signature equality）隔离；不得让
  transcript-only/loading/streaming snapshot 直接触发这些区域的
  clear/rebuild。transcript region 由 `TranscriptRegion` 组件包裹的命令式
  渲染器（`src/sidebar/assistantTranscriptRenderer.js`）持有，其虚拟滚动
  与行身份语义不受 chrome 组件重渲染影响。"

All other bullets in "Assistant Workspace UI硬约束" and the entire
"ACP Transcript Projection硬约束" section carry over verbatim — they
state behavioral invariants that the refactor did not change.

## Merge procedure (for the authorized merge session)

1. Confirm open items 1–2 are either closed or explicitly accepted as
   post-merge follow-ups by the user.
2. `git checkout main && git merge --no-ff dev-assistant-ui` (or rebase per
   the user's choice; the branch has been kept current via the 2026-07-25
   dev merge).
3. Apply the AGENTS.md rewrite draft above in the merge commit or an
   immediately following commit.
4. Re-run the full gate list on the merged tree (build, test:node:core,
   lint, localization, help-docs, ssot-invariants, test:lite, OpenSpec
   strict for archived changes).
5. Update the refactor plan artifact status to "merged".
