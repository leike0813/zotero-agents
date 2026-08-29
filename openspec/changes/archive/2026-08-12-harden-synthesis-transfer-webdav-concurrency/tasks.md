## 1. Regression Evidence

- [x] 1.1 Add failing transfer tests for active reap/cancel/stop, deferred cleanup, and exact byte release
- [x] 1.2 Add failing WebDAV tests for pause-versus-sync and retry-versus-stop, including the canonical retry schedule
- [x] 1.3 Add failing real-process shutdown coverage for active transfer and maintenance/retry work

## 2. Background and Transfer Ownership

- [x] 2.1 Add the composition-owned background-task registry with closed admission, cancellation, reaping, and bounded drain
- [x] 2.2 Route transfer attempts and public maintenance workers through the registry
- [x] 2.3 Replace transfer byte arithmetic with typed single-owner reservations and defer active-session cleanup
- [x] 2.4 Order shutdown so work drains before transfer files and storage owners are released

## 3. WebDAV Concurrency

- [x] 3.1 Serialize WebDAV load-patch-save transitions and preserve concurrent pause/control state at sync terminalization
- [x] 3.2 Replace the production retry scheduler with interruptible generation waits
- [x] 3.3 Align automatic retry delays to 60s, 5m, 15m, and 30m and stop retry work at pause/abort/shutdown

## 4. Documentation and Verification

- [x] 4.1 Sync approved delta requirements to main OpenSpec and update current runtime documentation
- [x] 4.2 Append fifth-stage baseline, TDD evidence, patch identity, validation results, remaining blockers, and non-release scope to the premerge audit
- [x] 4.3 Run Rust format, Clippy, workspace tests and build; focused Node real-process tests; service, contract, capability, transfer, surface, OpenSpec, Prettier, and diff gates
