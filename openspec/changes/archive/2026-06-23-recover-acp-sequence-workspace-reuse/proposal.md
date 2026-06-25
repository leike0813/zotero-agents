## Why

Recovered ACP sequence runs can validate a non-final step after plugin restart
but fail to launch the next step because workflow workspace reuse state only
lives in memory. This leaves valid sequence output parked even though the
original ACP workspace still exists on disk.

## What Changes

- Restore ACP workflow workspace reuse registration before recovered non-final
  sequence continuation launches downstream steps.
- Rebuild runner-owned result/audit namespace counters from existing workspace
  directories so recovered runs do not overwrite previous step files.
- Add test-only reset coverage for the in-memory ACP workflow workspace registry
  to simulate plugin restart.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-runtime`: recovered ACP sequence continuation must restore
  reusable workspace state before launching downstream steps.
- `acp-skillrunner-compatible-runner`: detached recovered ACP Skills runs must
  reuse the original workflow workspace when it still exists.

## Impact

- Affects ACP sequence recovery and workspace allocation in
  `src/modules/acpSkillRunnerWorkspace.ts` and
  `src/modules/acpSkillRunnerOrchestrator.ts`.
- Adds focused regression coverage in existing ACP sequence/runtime tests.
- No database schema migration or dependency change.
