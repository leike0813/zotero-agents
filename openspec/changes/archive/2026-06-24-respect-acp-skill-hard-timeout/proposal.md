## Why

ACP Skills currently validates `runner.json.runtime.default_options.hard_timeout_seconds` but does not apply the option during ACP-backed execution. Long ACP turns can therefore keep the local connection active indefinitely, and ACP workflow settings do not expose the same Job Timeout control that SkillRunner users already have.

## What Changes

- Add SkillRunner-compatible effective runtime option synthesis for ACP skill runs.
- Apply `hard_timeout_seconds` as a recoverable ACP connection guard with a 1200 second fallback.
- Reset timeout monitoring by execution turn: continuous auto runs use one execution window, while interactive runs stop monitoring while waiting for the user and restart after each reply.
- Expose `hard_timeout_seconds` as `Job Timeout (sec)` for ACP provider workflow options and submit dialogs.

## Capabilities

### New Capabilities

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: ACP skill runs shall apply effective hard timeout options without introducing new terminal states.
- `acp-skills-runtime-options`: ACP workflow settings shall expose and normalize the Job Timeout runtime option.

## Impact

- ACP skill runner orchestration and recovery connection lifecycle.
- ACP provider runtime option schema and normalization.
- ACP compatible runner and workflow settings tests.
