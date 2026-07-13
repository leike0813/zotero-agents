## 1. Trace Contract and Recorder TDD

- [x] 1.1 Add contract tests for complete payloads, source-bound ownership, Chat multi-turn and Workflow multi-request hierarchy, shared boundary reclassification, and cross-source rejection.
- [x] 1.2 Add persistence tests for NDJSON sequence/footer/hash validation, atomic save, partial recovery, corrupt input, configured quotas, and incomplete states.
- [x] 1.3 Implement the semantic trace DTO, canonical encoding, validation, digest, quota accounting, and local file store.
- [x] 1.4 Implement the debug-only recorder state machine, root binding, semantic event facade, buffered partial writes, freeze/save lifecycle, and shutdown cleanup.
- [x] 1.5 Wire adapter notifications plus Chat prompt, workflow lifecycle, permission outcome, terminal, and connection-close semantic events before projection divergence.

## 2. Replay Engine and Safety TDD

- [x] 2.1 Add scheduler and target tests for recorded/burst cadence, fresh owner mapping, consumer failure, unknown update, abort, drain failure, and source mismatch.
- [x] 2.2 Add fail-fast safety tests proving replay cannot invoke backend, transport, subprocess, MCP, Host Bridge mutation, library mutation, convergence, apply-back, or original-workspace writes.
- [x] 2.3 Implement trace loading, source-specific Chat/Workflow replay targets, shared boundary reclassification, owner mapping, permission projection/outcome, and safe replay ports.
- [x] 2.4 Implement the sequential recorded/burst scheduler with counts, bytes, lag, abort, warnings, and explicit drain results.

## 3. Matrix, R2, and Profiler Symmetry TDD

- [x] 3.1 Add tests for the fixed three-surface order, three warm-ups plus six formal runs, unique owners, profile-window boundaries, restoration, and incomplete matrices.
- [x] 3.2 Add R2 v1 contract tests for request, fragment, concurrency, timing and byte counts plus mutation-dispatch isolation.
- [x] 3.3 Add symmetric Chat/Skills R3 lifecycle and surface-attribution tests, including no R3 for closed and rendering-identity regression coverage.
- [x] 3.4 Implement Workspace surface orchestration, explicit drains, fresh-run targets, `finally` restoration, and nine-run matrix control.
- [x] 3.5 Implement `ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1` through parser/input/no-op response seams.
- [x] 3.6 Implement the replay matrix DTO, provenance/comparison guard, JSON save, and three-surface Markdown summary.
- [x] 3.7 Refactor profiler lifecycle and R3 prepare/signature/post instrumentation into symmetric Chat and Skills target adapters.

## 4. Dashboard and Source Elision TDD

- [x] 4.1 Replace Live Capture UI tests with independent Recorder and Replay Profiler tab/action/signature tests and sensitive-local-only affordance assertions.
- [x] 4.2 Add independent recorder/profiler source-switch release-elision tests and runtime mutual-exclusion tests.
- [x] 4.3 Replace Dashboard Live Capture snapshot/actions/rendering with Recorder type/quota/state/save/folder controls and Replay trace/phase/cadence/progress/warning/result controls.
- [x] 4.4 Add localization and styling for both tabs without placing transcript state in Dashboard chrome or unrelated region signatures.
- [x] 4.5 Remove obsolete Live Capture controller/copy workflow and consolidate retained freeze/save primitives behind the two new state machines.

## 5. Baseline, Documentation, and Validation

- [x] 5.1 Reclassify the automated surface matrix and committed artifacts as CI mechanism smoke baselines while preserving their deterministic assertions.
- [x] 5.2 Update profiler/baseline specs, debug-mode and profiler docs, Dashboard docs, test guide, and performance risk audit for trace/replay governance and Gecko Profiler separation.
- [x] 5.3 Run focused core/UI/node tests, TypeScript, ESLint, Prettier, localization, production build, both release-elision checks, `git diff --check`, and strict OpenSpec validation.
- [ ] 5.4 Record manual Zotero acceptance as pending unless real multi-turn Chat and multi-stage Workflow traces are captured and replayed without a backend on both supported host families.
- [x] 5.5 Add a host-safe monotonic clock fallback and regression coverage for privileged Zotero scopes without `globalThis.performance`.
