## 1. Replay Identity TDD

- [x] 1.1 Add tests for stage normalization, trace sample derivation, Unicode-safe slugs, bounded segments, paired stems, nonce collisions, and digest-based comparability.
- [x] 1.2 Implement the Replay identity module and replace the fixed phase enum with required host-owned free text.
- [x] 1.3 Persist sample/stage provenance and write paired JSON/Markdown results with the new collision-safe filenames.

## 2. Current Progress and Result Projection TDD

- [x] 2.1 Add matrix/controller tests for awaited current-slot publication, profile-window ordering, cancellation cleanup, retry draft retention, and nine-slot transitions.
- [x] 2.2 Implement `onRecordStart`, controller `currentRun`, terminal cleanup, and browser-local elapsed timing without in-window snapshot publication.
- [x] 2.3 Add one formal surface-summary projection shared by Markdown and Dashboard, with structured per-run R1/R2/R3/drain/warning detail.

## 3. Progressive Dashboard UI TDD

- [x] 3.1 Add host-action and DOM tests for required stage input, draft recovery across Browse/preflight, 3x3 progress states, summary cards, and expandable detail.
- [x] 3.2 Reorganize Recorder and Replay markup/styles around concise default sections and progressive disclosure while retaining independent source gates.
- [x] 3.3 Add all locale keys for stage validation, sample identity, progress slots, result summaries, advanced limits, and evidence details.

## 4. Documentation and Validation

- [x] 4.1 Update profiler, Dashboard, and testing documentation for stage/sample identity, live progress, filenames, and evidence presentation.
- [x] 4.2 Run focused core/UI/node tests, TypeScript, ESLint, Prettier, localization governance, production build, release-elision, `git diff --check`, and strict OpenSpec validation.
- [x] 4.3 Record Zotero 7/9 manual acceptance as pending unless both hosts are exercised for Unicode filenames, multi-stage runs, cancellation/retry, and responsive layout.
