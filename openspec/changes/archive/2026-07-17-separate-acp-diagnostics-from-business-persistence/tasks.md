## 1. Characterization and Contract Tests

- [x] 1.1 Add ACP Skills diagnostic-burst tests that exercise the adapter listener and assert zero canonical run/event/transcript/publication changes after governance.
- [x] 1.2 Add ACP Chat persistence tests for diagnostic omission, legacy-row business recovery, current-process Details/Copy behavior, and owner isolation.
- [x] 1.3 Add audit-buffer tests for debug/release gating, sanitization, physical batching, hard-limit overflow, and failure isolation.

## 2. Shared Diagnostic Policy

- [x] 2.1 Add the persistence-safe diagnostic evidence DTO and shared non-throwing severity router.
- [x] 2.2 Route release warn/error evidence to bounded runtime logs and debug evidence through surface-specific audit sinks without business-store dependencies.

## 3. ACP Skills Separation

- [x] 3.1 Replace both ACP Skills diagnostic listeners with one shared handler and remove diagnostic-driven `upsertAcpSkillRun` and Workspace change effects.
- [x] 3.2 Preserve existing Skills audit formats and low-volume normal-mode artifacts while adding audit-only bounds and best-effort owner release.
- [x] 3.3 Verify permission, close, prompt failure, interruption, terminal, result, apply, archive, and recovery persistence remain unchanged.

## 4. ACP Chat Separation

- [x] 4.1 Keep owner-scoped diagnostics in memory while omitting diagnostics, stderr tail, and diagnostic lifecycle observation from conversation writes and hydration.
- [x] 4.2 Add debug-only per-conversation `diagnostics.ndjson` audit with stable owner keys and no hydration path.
- [x] 4.3 Flush/release audit on close, disconnect, archive, and shutdown; discard before conversation/backend/synthetic deletion.
- [x] 4.4 Lock diagnostic-only Assistant Workspace DOM/publication identity invariants.

## 5. Backpressure, Documentation, and Verification

- [x] 5.1 Add optional audit-only drop-oldest hard limits and overflow diagnostics to the buffered-write coordinator without changing default business-channel behavior.
- [x] 5.2 Document the business/diagnostic classification and measured causal before/after evidence in the R1 governance artifact.
- [x] 5.3 Validate OpenSpec, targeted tests, release diagnostic elision, Node/Zotero core tests, lint, build, and existing replay regression matrices.
  - Passed: OpenSpec strict validation, targeted tests, release-elision, Zotero core/UI lite, lint, production build, Node Replay suites reached before the unrelated failure.
  - Blocked: the full Node core command has seven independently reproducible failures in `test/core/155-topic-synthesis-split-runtime.test.ts`; the saved live/boundary/silent trace matrix still requires the explicit debug Dashboard runner.

