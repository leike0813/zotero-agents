## Context

ACP workflow workspace reuse is currently keyed by `workflow_run_id` in an
in-memory map. Normal foreground sequence execution works because the first
step registers the workspace and downstream steps reuse it in the same plugin
session. After plugin restart, the sequence state and ACP run record remain
persisted, but the in-memory workspace map is empty.

## Approach

Add a small registry restoration API in the ACP workspace module. It accepts a
known `workflowRunId` and `workspaceDir`, validates that the workspace still
exists, scans existing runner-owned `result/<skill>.<n>` and
`.audit/<skill>.<n>` directories, and registers namespace counters at the
highest observed index per skill.

Recovered non-final sequence continuation will call this API before invoking
`continueSkillRunnerSequence`. The recovered run record already carries the
original workspace path, while sequence state carries the workflow run id, so no
new persistence contract is required.

## Edge Cases

- Missing workspace directory remains a hard failure, but reports that the
  recovered workflow workspace is unavailable instead of looking like a pure
  memory-map miss.
- Existing namespace directories in either `result` or `.audit` count toward
  the next namespace index.
- Re-registering an already-known workflow run id refreshes counters from disk
  and keeps workspace reuse deterministic.

## Alternatives Considered

- Persisting a separate workspace registry table was rejected because the
  required source of truth already exists in ACP run records plus the workspace
  filesystem.
- Lazily resolving inside `createAcpSkillRunnerWorkspace(mode: "reuse")` was
  rejected for now because the workspace module does not own access to run
  stores, and recovery already has the needed context.
