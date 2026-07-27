## 1. Contract Evidence

- [ ] 1.1 Add failing differential fixtures for all nine owned operations, WebDAV states/conflicts, maintenance DTOs, and stable failures
- [ ] 1.2 Add remote-success/local-crash, restart, reset phase, owner/admission conflict, Host failure, bounds, deadline, and Rust-only repair fixtures

## 2. WebDAV Surface

- [ ] 2.1 Replace process-memory WebDAV authority with atomic durable state, conflict, retry, and receipt persistence
- [ ] 2.2 Implement sync/pause/resume/retry/conflict operations through the secret-free bounded reverse-Host transport
- [ ] 2.3 Reconcile partial remote operations idempotently after transport failure or restart

## 3. Maintenance and Repair Surface

- [ ] 3.1 Implement public maintenance and startup reconcile through dedicated typed ports
- [ ] 3.2 Implement database and clean-install reset with owner/admission checks, checkpoint/backup preconditions, exclusive lease, and phase receipts
- [ ] 3.3 Implement restart detection and Rust-only repair for partial maintenance phases

## 4. Domain Gate

- [ ] 4.1 Pass the nine-operation differential corpus, focused Rust/Core/Stage-1 tests, crash/reopen checks, format/clippy, and cross-language checks
- [ ] 4.2 Promote only proven WebDAV/Maintenance capabilities to the ready roster without publishing the default client
