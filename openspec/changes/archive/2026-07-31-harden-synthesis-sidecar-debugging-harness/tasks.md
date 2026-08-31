## 1. Lock Diagnostic and Dashboard Behavior

- [x] 1.1 Extend existing debug-mode and Task Manager tests for the independent Synthesis gate, direct-tab rejection, and system/backend grouping
- [x] 1.2 Extend existing diagnostic tests for failure-only production logs, 500-event debug retention, correlation detail, and payload-key rejection
- [x] 1.3 Extend release-elision tests to compile and inspect the real Dashboard entry and source-disabled debug output

## 2. Implement the Debugging Harness

- [x] 2.1 Add the independent hard-coded source switch and make the Synthesis diagnostic recorder, store, subscriptions, and projection build-exclusive
- [x] 2.2 Split production failure summaries from debug start/success events and gate native emission plus supervisor parsing at launch
- [x] 2.3 Replace the runtime-log mirror with the grouped, filterable Synthesis system page and selectable correlated sanitized details
- [x] 2.4 Bundle the Dashboard with diagnostic defines and extend the shared production-isolation manifest and checker

## 3. Repair Reference Refresh

- [x] 3.1 Extend Host/Rust tests for partial output writes, a valid response above 1 MiB, the 8 MiB boundary, exact attempted/limit evidence, and stable nested error causality
- [x] 3.2 Extend Reference Refresh tests for first-class estimated size, aggregate byte/node admission, failed preparation cleanup, and same-process retry
- [x] 3.3 Implement the capability-specific reverse-Host limit/timeout and keep TypeScript/Rust policy parity
- [x] 3.4 Preserve reverse-Host error envelopes through native and plugin RPC mapping without exposing payloads
- [x] 3.5 Enforce aggregate Rust apply admission and discard every post-prepare Host/materialization failure

## 4. Documentation and Verification

- [x] 4.1 Update Synthesis runtime supervision, runtime/rebuild, and performance documentation to match the two diagnostic planes and capability-specific transport
- [x] 4.2 Run OpenSpec strict validation, focused TypeScript/Zotero/Rust tests, type checks, clippy/format checks, production build, and release-elision gates
