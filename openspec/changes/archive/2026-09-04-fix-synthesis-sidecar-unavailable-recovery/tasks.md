## 1. Native HTTP admission

- [x] 1.1 Add a failing server-loop test proving a seventeenth loopback request waits while sixteen handlers are occupied and verify the targeted Cargo test is red under immediate-503 admission
- [x] 1.2 Change admission to leave saturated sockets in the OS backlog and verify the targeted server-loop test passes without exceeding sixteen handlers or weakening shutdown bounds

## 2. Workbench refresh coalescing

- [x] 2.1 Extend the existing Workbench UI test with overlapping chrome refreshes and verify it fails by observing more than one concurrent read
- [x] 2.2 Implement per-runtime chrome single-flight with one latest follow-up and force-OR semantics, then verify the targeted Workbench UI test passes

## 3. Production client recovery

- [x] 3.1 Extend existing client-composition and supervisor tests for ready-then-exit recovery, concurrent callers, ineligible states, and a failed recovery latch; verify the new cases fail before implementation
- [x] 3.2 Wire one pre-dispatch recovery attempt through the default client and production owner, then verify the recovery tests pass and no post-dispatch request is replayed

## 4. Structured unavailable reasons

- [x] 4.1 Extend existing observability tests for `service_not_ready`, `transport_unavailable`, and safe sidecar reasons; verify the new cases fail without the optional reason identity
- [x] 4.2 Add the optional v2 reason identity and record it at pre-dispatch operation and host-RPC terminal boundaries, then verify observability and contract type checks pass

## 5. Integration verification

- [x] 5.1 Run the isolated 104-operation production-route matrix five times and verify no operation reports a drifting `service_unavailable`
- [x] 5.2 Run the complete production-route, affected TypeScript tests/checks, Rust tests, clippy, and formatting checks; document any independent pre-existing failure without weakening this change
- [x] 5.3 Validate the OpenSpec change strictly and confirm every task and specified scenario is complete

Verification note: the Windows-only drift came from accepted sockets retaining
the listener's nonblocking state; an immediate `WouldBlock` was classified as
`request_timeout`, and closing while Node was still writing surfaced as
`ECONNRESET`. Restoring blocking mode at the shared stream-configuration seam
made five consecutive 104-operation matrix runs pass without request replay.
The affected TypeScript run passed 133 tests; its remaining setup failure is a
Windows `EPERM` while creating the inventory test's `node_modules` symlink. The
complete production-route run passed 22 tests and retained three independent
baseline failures: one Windows temporary-directory removal `EPERM`, plus two
Reference tests that still assert the removed `receipt.ok` field instead of the
current `synthesis.maintenance_receipt.v1` contract.
