## Why

The debug Dashboard exposes trace recording and replay as two disconnected tabs. The Replay run button never updates after a user types a path, progress is published only after all nine runs finish, and neither replay nor recording can be canceled and restarted cleanly. The workflow should guide one repeatable local operation from capture through validated replay without requiring a Zotero restart.

## What Changes

- Merge Recorder and Replay Profiler into one two-step `ACP Trace & Replay` Dashboard surface while preserving independent source switches and state machines.
- Add native trace selection, manual-path preflight metadata, saved-trace handoff, inline failures, live nine-run progress, cancel, and retry.
- Add Recorder cancel/reset operations that preserve partial diagnostics, release diagnostic ownership, and allow repeated recording rounds.
- Make replay cancellation interrupt cadence waits, stop future matrix runs, retain an incomplete matrix, and restore Workspace state.

## Capabilities

### Modified Capabilities

- `acp-runtime-semantic-trace`: Repeatable recorder lifecycle, cancellation, partial preservation, and failure recovery.
- `acp-runtime-replay-profiler`: Unified two-step Dashboard workflow, trace preflight, progress, cancellation, and retry.

## Impact

- Recorder and Replay controller state contracts, matrix orchestration, Dashboard tabs/actions/rendering/signatures, shared host file selection, localization, docs, and focused tests.
