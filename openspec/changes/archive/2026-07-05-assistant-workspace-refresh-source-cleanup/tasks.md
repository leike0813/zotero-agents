## 1. OpenSpec

- [x] 1.1 Create proposal, design, tasks, and delta spec for refresh source cleanup.

## 2. Host Refresh Source Cleanup

- [x] 2.1 Remove shell-load full init publication from the shell frame load handler.
- [x] 2.2 Skip the streaming preference subscription's initial synchronous callback.
- [x] 2.3 Suppress duplicate subscription refreshes for same-host local streaming preference writes.
- [x] 2.4 Remove redundant ACP Chat and ACP Skills handler-level snapshot scheduling for streaming toggles.

## 3. Tests and Verification

- [x] 3.1 Add smoke/source guards for shell-load, streaming preference subscription, and streaming toggle refresh sources.
- [x] 3.2 Run OpenSpec validation, focused workspace/UI tests, TypeScript, and diff checks.
