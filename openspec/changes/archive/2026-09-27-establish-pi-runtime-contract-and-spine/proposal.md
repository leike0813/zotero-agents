# Proposal

## Why

The Built-in Pi Agent Runtime program needs a small, browser-safe execution seam before durable owners, provider configuration, and tools are added. A deterministic turn in real Zotero establishes that seam and prevents native Pi SDK state from becoming a public contract.

## What Changes

- Pin matching native `@earendil-works/pi-agent-core` and `@earendil-works/pi-ai` packages at `0.84.4`.
- Add a transient `PiRuntime` module that opens sessions, runs one prepared turn at a time, publishes ordered project-owned events and one terminal result, aborts an active turn, and disposes idempotently.
- Prove the module with a deterministic faux stream in Node and real Zotero through the current test runners.

## Capabilities

### New Capabilities

- `builtin-pi-runtime-spine`: Transient Pi session and turn execution, event normalization, cancellation, and cleanup.

### Modified Capabilities

None. Provider dispatch, product owners, and Assistant Workspace integration remain separate later changes.

## Impact

- New internal interface in `src/modules/piRuntime.ts`; no user-facing UI or persistent data.
- Exact npm dependencies in `package.json` and `package-lock.json`.
- Shared faux fixture and runtime/Zotero tests, admitted by the current Node shard runner.

This is W0 C01 from the accepted [implementation program](https://github.com/leike0813/zotero-agents/issues/26). The maintainer explicitly waived its published-v0.9.0 prerequisite for starting W0; the archived canonical Broker implementation is the baseline. The older handoff's pure-spec first change and Strong-sandbox MVP assumptions are superseded by the Wayfinder decisions.
