# Tasks: Assistant Workspace Hardening And Merge Prep

## 1. R3 Metric Emission (TDD)

- [x] 1.1 Update `test/helpers/acpRuntimePerformanceHarness.ts`: exercise the real coordinator `publishRegion` and runtime `readTranscriptPage` paths so each surface state produces signature builds, at least one signature skip, and page reads; delete the synthetic R3 emission block (:369-386).
- [x] 1.2 Update `test/core/176-acp-silent-runtime-performance-baseline.test.ts`: assertions move from synthesized counts to the real emission counts. Confirm red before implementation.
- [x] 1.3 `src/modules/assistantWorkspacePublicationCoordinator.ts` `publishRegion`: emit `panel_signature`/`panel_signature_bytes`/`panel_signature_duration` on build, `panel_signature_skip` on hit; labels `publicationSurface`+`publicationKind`; synchronous only.
- [x] 1.4 `src/modules/assistantWorkspacePublicationRuntime.ts`: wrap the three `readTranscriptPage` call sites with `transcript_page_read`/`transcript_page_scan_items`/`transcript_page_read_duration`; labels `publicationSurface`+`publicationCause`+`publicationPhase`; timing wrap only, no added microtask yields.
- [x] 1.5 Verify: 176 green; 97/178–184/190–193 green (97 mount-preservation cases are the timing-regression tripwire).

## 2. Baseline Refresh

- [x] 2.1 `scripts/record-acp-runtime-governance-baseline.ts`: add `--output-prefix` (default unchanged).
- [x] 2.2 Record `artifact/performance-baselines/acp-runtime-after-workspace-refactor-*.{json,md}` via the script's double-run determinism gate; keep the 2026-07-18 files untouched.
- [x] 2.3 Summary md notes: label-shape incomparability with the 2026-07-18 recording (post-Phase-3/4 publication plane), and the new region-isolation / transcript-paging coverage.

## 3. Decision Records

- [x] 3.1 Append "Phase 5 implementation notes" to `artifact/assistant-workspace-refactor-plan-20260718.md`: transcript renderer final decision (keep custom imperative renderer behind the `TranscriptRegion` component wrapper; verified current state, no code change); Phase 4 ≤ ~2k LOC deviation accepted and closed.

## 4. Live Zotero 9 Replay Matrix + Smoke

- [x] 4.1 `npm run build`, launch Zotero 9 via `npm run start:direct` (`.env`: `/usr/bin/zotero`, profile `v3g4pnq9.dev`).
- [x] 4.2 Record one real multi-turn Chat trace and one real multi-stage Workflow trace via the Dashboard ACP Trace Recorder (requires a configured ACP backend; confirm at execution time).
- [x] 4.3 Run the nine-record replay matrix; verify stable trace digest, surface attribution, Workspace state restoration; exercise the recorder edge cases per the profiler doc checklist. (partial: disconnect recovery, replacement-session notice, same-session reconnect binding not exercised — rolled into the Zotero 7 pass; see replay-matrices README)
- [x] 4.4 SkillRunner tab smoke sweep per the §8.7 checklist used in Phase 3 acceptance. (limited: backend-unavailable state verified live; full lifecycle smoke needs a reachable SkillRunner backend — recorded in the Phase 5 notes)
- [x] 4.5 Archive `acp-replay-*` artifacts to `artifact/performance-baselines/`; record results in the Phase 5 notes; record Zotero 7 as an open pre-merge item.

## 5. Full Gates

- [x] 5.1 `npm run build` (incl. both `tsc --noEmit` configs).
- [x] 5.2 `npm run test:node:core` (focus 97/176/178–184/190–193).
- [x] 5.3 `npm run lint:check`.
- [x] 5.4 `npm run check:localization-governance`.
- [x] 5.5 `npm run check:help-docs`.
- [x] 5.6 `npm run check:ssot-invariants`.
- [x] 5.7 `npm run test:lite`.
- [x] 5.8 `openspec validate --strict` (all changes).

## 6. Merge Prep

- [x] 6.1 New `artifact/assistant-workspace-merge-prep-20260807.md`: per-phase gate summary, open items (Zotero 7 replay matrix, dual-host smoke), AGENTS.md hard-constraint rewrite draft (component/props-memoization wording, every behavioral invariant preserved), merge procedure.
- [x] 6.2 Finalize Phase 5 implementation notes in the plan artifact (quantitative outcome, acceptance).
- [ ] 6.3 Archive this change.
