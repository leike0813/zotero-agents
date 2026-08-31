# Replay Matrix Artifacts

Live-host replay matrix evidence. Each file is the markdown summary of one
nine-record matrix run (3 surface states × 1 warm-up + 2 formal) produced by
the Dashboard ACP Replay Profiler
(`doc/components/acp-runtime-performance-profiler.md`).

Archival convention (established 2026-08-07, Phase 5):

- Archive the `.md` summary of every acceptance-relevant matrix run here.
- Archive the `.json` only when small (< ~1 MB); full JSONs stay in the
  runtime result directory
  (`<dataDir>/zotero-agents/runtime/profiles/acp-replay/`) — they are
  reproducible from the trace and are not comparison input across versions
  ("historical versioned matrix files are not compatibility input").
- Traces themselves (`acp-traces/*.ndjson`) are sensitive local data
  (full prompts/tool output) and are NEVER archived to the repo.

## 2026-08-07 — Phase 5, Zotero 9 (140 esr), dev-assistant-ui post-refactor

| File | Trace | Mode | Cadence | Result |
| --- | --- | --- | --- | --- |
| `…chat旧trace回归…` | chat 2026-07-15 (6653 events, pre-refactor recording) | live | logical | accepted |
| `…workflow旧trace回归…-2` | workflow 2026-07-13 (15428 events, pre-refactor recording) | live | logical | 9/9 complete; rejected `posted-bytes-exceeded` — see note below |
| `…workflow旧trace回归-boundary…-6/-7` | same | boundary | logical | accepted ×2 (second run = retry with fresh owners) |
| `…chat新trace…` | chat 2026-08-07 (208 events, recorded on refactored build) | boundary | logical | accepted |
| `…workflow新trace…` | workflow 2026-08-07 (108145 events, recorded on refactored build) | boundary | logical | 9/9 complete; rejected `posted-bytes-exceeded` — trace is 6× larger than the budget-calibration trace; all governance shape checks clean (steady-state deltas only, lifecycles accepted, no rebase/recovery) |
| `…cancel用例…` | chat 2026-07-15 | boundary | recorded | canceled mid-run; artifact saved with Execution/Measurement `incomplete` (expected) |

Posted-bytes analysis (target-active formal, per kind): the fixed
workflow budget (557,610 B) was calibrated 2026-07-16 on the old trace in
boundary mode. Like-for-like boundary comparison, same trace: pre-refactor
512,783 B (2026-07-17) vs post-refactor 508,717/508,756 B — transcript
bytes identical within 0.02%, no regression. Live mode exceeded the budget
identically before the refactor (635,763 B on 2026-07-17) and posts
slightly fewer bytes now (631,639 B).

Not exercised on this pass (open items, profiler doc checklist):
disconnect recovery, replacement-session notice, same-session reconnect
binding; Zotero 7 host (not installed).
