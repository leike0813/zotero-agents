## 1. Logical Scheduler and Isolation TDD

- [x] 1.1 Add stable tests for logical deadline ordering, callback batching, cancellation, tail resumption, and no real trace-gap waits.
- [x] 1.2 Add release-elision and inactive hot-path tests proving direct native timers and zero logical calls when disabled or inactive.
- [x] 1.3 Implement the run-scoped logical scheduler and structured contamination model without global timer patches or Node-only APIs.

## 2. Synthetic Timer Control TDD

- [x] 2.1 Extend Chat, Skills, and Workspace tests for inspect/detach/fire/resume, token replacement, owner isolation, tail drain, and fallback flush.
- [x] 2.2 Add replay-only control surfaces while preserving all five production scheduling paths unchanged.
- [x] 2.3 Compose the logical production port and enforce clean baseline, owner/host scope, fail-closed contamination, and finally cleanup.

## 3. Replay Matrix, UI, and Reports

- [x] 3.1 Extend profiler/controller/UI tests for the logical cadence, strict parsing, retry preservation, matrix isolation, and synthetic timing classification.
- [x] 3.2 Integrate logical advance/capture/release into replay and matrix lifecycles while leaving recorded and burst paths unchanged.
- [x] 3.3 Add Dashboard selection, localization, JSON/Markdown metadata, comparability guards, and structured incomplete reasons.

## 4. Documentation and Validation

- [x] 4.1 Update profiler, Debug mode, Dashboard, and testing documentation for logical replay semantics, limits, and zero-overhead isolation.
- [x] 4.2 Run focused tests, TypeScript, ESLint, Prettier, localization, release-elision, production build, strict OpenSpec validation, and `git diff --check`.
- [ ] 4.3 Record Zotero 7/9 real-host acceptance with the 15,427-event trace as pending unless both hosts are available; target 9/9 complete, no contamination, recorded-like counters, and at most five minutes on the reference host.
