## Why

SkillRunner foreground execution can lose its local network observer during Zotero/plugin shutdown while the backend request continues running. The frontend currently risks treating that observer failure as a terminal run failure, which can prevent startup recovery even though the backend later reaches a valid terminal result.

## What Changes

- Add tolerance to SkillRunner terminal failure classification after a backend request id exists.
- Keep backend-observed `failed` and `canceled` states as true terminal outcomes.
- Treat local transport/network/shutdown observer errors after a recoverable request boundary as non-terminal recovery candidates instead of immediate terminal failures.
- Preserve the existing recovery SSOT: recovery scans projectable SkillRunner run records and does not fall back to backend-wide run list scanning.
- Leave sequence step projection hardening as a separate investigation unless it is directly required to satisfy the tolerance contract.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `workflow-execution-seams`: SkillRunner foreground settlement and recovery boundary requirements will distinguish backend terminal states from local observer failures.

## Impact

- Affected code is expected around SkillRunner provider dispatch, job queue failure classification, sequence runtime step failure handling, and task/run projection settlement.
- No dependency or backend API changes are expected.
- Runtime logs and tests should reflect that local observer failures after a recoverable SkillRunner request boundary remain recoverable rather than terminal.
