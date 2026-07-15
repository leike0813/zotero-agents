## 1. Recorder Recovery TDD

- [x] 1.1 Add tests for cancel footer/partial preservation, saved and canceled reset, repeated rounds, and diagnostic-mode release after setup failure.
- [x] 1.2 Implement shared recorder finalization, cancel, recoverable setup failure, and reset/new-round operations without deleting artifacts.

## 2. Replay Selection, Progress, and Cancel TDD

- [x] 2.1 Add controller and matrix tests for preflight metadata, saved-path selection, per-record progress, interruptible cadence, early abort, incomplete matrix persistence, retry, and cleanup/restoration.
- [x] 2.2 Implement Replay draft/preflight state, native file selection seam, background progress publication, controller-owned abort, and retry lifecycle.
- [x] 2.3 Harden matrix setup/finish/target cleanup/Workspace restoration and add an awaited post-record callback outside profile windows.
- [x] 2.4 Add regressions for Replay start/cancel without a host `AbortController` and visible Dashboard action failure state.
- [x] 2.5 Replace the browser-global cancellation dependency and observe the Dashboard Replay start promise.
- [x] 2.6 Add regressions for shell/child readiness, render acknowledgement, profile drain ordering, and Workflow primary owner mapping.
- [x] 2.7 Implement cancelable Workspace readiness/publication drain and align the Workflow target-active owner.
- [x] 2.8 Add regressions for child-ready recovery after an early declaration and Workspace target recommit.
- [x] 2.9 Scope child readiness to the shell document lifetime and add an idempotent host-init/frame-load handshake.
- [x] 2.10 Add regressions for explicit profile aliases, semantic event dispositions, measured R2, source-matched R3, v2 completeness, legacy loading, and formal report aggregation.
- [x] 2.11 Implement matrix v2 run scopes, R1/R2/R3 attribution, structured measurement coverage, and legacy v1 normalization.

## 3. Unified Dashboard Workflow

- [x] 3.1 Add DOM interaction tests for immediate typed-path enable/disable, preflight triggers, Browse, Cancel, saved-trace handoff, New Recording, and one merged surface signature.
- [x] 3.2 Replace the two tabs with one `ACP Trace & Replay` two-step surface while retaining independent source-switch imports and mutual exclusion.
- [x] 3.3 Add localized labels, inline validation/progress/result states, and remove obsolete two-tab keys and rendering branches.

## 4. Documentation and Validation

- [x] 4.1 Update profiler, Dashboard, debug-mode, and testing docs for the unified repeatable workflow and cancellation artifact policy.
- [x] 4.2 Run focused core/UI/node tests, TypeScript, ESLint, Prettier, localization, production build, release-elision, `git diff --check`, and strict OpenSpec validation.
- [ ] 4.3 Record real Zotero 7/9 repeated-round and cancel/replay acceptance as pending unless performed in both hosts.
- [x] 4.4 Update profiler/debug/testing documentation for matrix v2 coverage and descriptive formal summaries.
