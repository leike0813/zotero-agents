# Tasks

## 1. OpenSpec

- [x] 1.1 Create proposal, design, tasks, and delta specs for the debug-only
  Dashboard audit tab.
- [x] 1.2 Document that the first version is read-only and not exposed through
  Preferences.

## 2. Connection Governor

- [x] 2.1 Add a redacted fixed-size connection lifecycle event ring buffer.
- [x] 2.2 Record queued, started, finished, timeout, abort, stream eviction,
  duplicate stream, and late settlement events.
- [x] 2.3 Extend the governor snapshot with backend/lane summaries and event
  history.
- [x] 2.4 Keep payloads, response bodies, tokens, and local paths out of
  snapshots and events.

## 3. Dashboard

- [x] 3.1 Add debug-mode-gated `skillrunner-connection-audit` tab selection.
- [x] 3.2 Build audit snapshot data only when debug mode is enabled and the
  audit tab is selected.
- [x] 3.3 Render summary metrics, backend/lane occupancy, event table, and copy
  JSON action in the Dashboard iframe.
- [x] 3.4 Ensure debug mode disabled hides the tab and performs no audit data
  read.

## 4. Host Bridge

- [x] 4.1 Add `debug.skillrunner.connections.snapshot`.
- [x] 4.2 Reuse the same redacted governor snapshot returned to Dashboard.

## 5. Tests

- [x] 5.1 Add governor tests for lifecycle event recording and ring-buffer
  retention.
- [x] 5.2 Add Dashboard snapshot tests for debug gating and no-read behavior.
- [x] 5.3 Add renderer/read-only harness coverage for the audit tab.
- [x] 5.4 Add Host Bridge debug capability coverage.
- [x] 5.5 Run OpenSpec, TypeScript, focused tests, and `git diff --check`.
