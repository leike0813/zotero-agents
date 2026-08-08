# Change: Assistant Workspace Hardening And Merge Prep

## Why

Phase 5 of the Assistant Workspace refactor
(`artifact/assistant-workspace-refactor-plan-20260718.md`). Phases 0–4 put
all three tabs on one publication plane with a single wire contract, one
transcript mirror store, one action dispatch table, and split god files.
What remains before the refactor branch can be proposed for merge:

- The R3 (Assistant Workspace publication) risk group of the runtime
  performance baseline has no production emission points for its
  region-isolation and transcript-paging metrics. `panel_signature`,
  `panel_signature_skip`, `panel_signature_bytes`,
  `panel_signature_duration`, `transcript_page_read`,
  `transcript_page_scan_items`, and `transcript_page_read_duration` exist
  in the metric-name union and the R3 grouping table but are emitted only
  synthetically by the test harness — the committed baseline
  (`artifact/performance-baselines/acp-runtime-before-governance-*`,
  recorded 2026-07-18, pre-Phase-3) measures a harness fabrication, and
  its label shape no longer matches the post-refactor code.
- The formal live Zotero 7/9 replay matrix
  (`doc/components/acp-runtime-performance-profiler.md` §"Manual Zotero
  Acceptance") has never been executed on any host.
- Two refactor decisions are pending final record: the transcript
  renderer disposition (expected: keep custom, component-wrapped) and the
  Phase 4 ≤ ~2k LOC split-target deviation.
- Merge preparation artifacts do not exist: gate summary, AGENTS.md
  hard-constraint rewrite draft (branch governance: rewritten at merge
  time), and the open-items checklist.

## What Changes

- **R3 metric emission points (production)**:
  - `assistantWorkspacePublicationCoordinator.ts` `publishRegion`: emit
    `panel_signature` / `panel_signature_bytes` /
    `panel_signature_duration` on signature build and
    `panel_signature_skip` on signature hit, labeled by
    `publicationSurface` + `publicationKind` (both already in the
    baseline label sanitizer).
  - `assistantWorkspacePublicationRuntime.ts`: wrap the three
    `adapter.readTranscriptPage(...)` call sites with
    `transcript_page_read`, `transcript_page_scan_items`, and
    `transcript_page_read_duration`, labeled by `publicationSurface` +
    `publicationCause` + `publicationPhase`. Timing wrap only — no added
    microtask yields (Phase 4 lesson: publication read-path async
    restructuring is timing-observable to the UI).
- **Harness alignment**: `test/helpers/acpRuntimePerformanceHarness.ts`
  stops synthesizing the seven R3 metrics and instead exercises the real
  coordinator/runtime paths; `test/core/176` assertions move to the real
  counts (sanctioned test migration, recorded in tasks).
- **Baseline refresh**: `scripts/record-acp-runtime-governance-baseline.ts`
  gains an output-prefix option; a post-refactor baseline is recorded to
  `artifact/performance-baselines/acp-runtime-after-workspace-refactor-*`.
  The 2026-07-18 files stay untouched as the historical record.
- **Decision records**: transcript renderer disposition (keep custom
  imperative renderer behind the `TranscriptRegion` component wrapper —
  verified as the current state; no code change) and acceptance of the
  Phase 4 LOC-target deviation are appended to the plan artifact as the
  Phase 5 implementation notes.
- **Live Zotero 9 replay matrix**: the profiler doc's Manual Zotero
  Acceptance procedure is executed on the local Zotero 9 host (real Chat
  trace + real Workflow trace, nine-record matrix, recorder edge cases,
  SkillRunner smoke sweep). `acp-replay-*` artifacts are archived under
  `artifact/performance-baselines/`. Zotero 7 is recorded as an open
  pre-merge item.
- **Merge prep artifact**:
  `artifact/assistant-workspace-merge-prep-20260807.md` — per-phase gate
  summary, the AGENTS.md hard-constraint rewrite draft
  (component/props-memoization wording preserving every behavioral
  invariant), open items (Zotero 7 matrix, dual-host smoke), and the
  merge procedure.

## Behavior Contract

No user-visible behavior change. The new metric emissions are
counter/duration observations at existing decision points; they must not
alter publication semantics, ordering, or resolution timing (the Phase 4
yield-timing regression class is the explicit anti-pattern). The existing
test suites (97/176/178–184/190–193 and the acp family) are the
acceptance contract; only the 176/harness migration is sanctioned.
Parked improvement items (`TODO(contract)` routes, column-E candidates)
are not piggybacked.

## Out Of Scope

- Merging `dev-assistant-ui` into `main` (separate, explicitly
  authorized step; the AGENTS.md rewrite is applied then, not here).
- Zotero 7 replay matrix and dual-host smoke (recorded as open items).
- Any wire protocol, persistence format, or transcript-renderer change.
- Re-splitting the four files that missed the ≤ ~2k LOC target
  (deviation accepted and closed, not re-litigated).
