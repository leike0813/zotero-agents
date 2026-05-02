## Why

ACP SkillRunner-compatible jobs already have a provider/orchestrator execution path, but they do not have a dedicated product surface for observing sessions, run state, repair, validation, or cancellation. Users currently have to infer state from generic task rows and runtime logs.

## What Changes

- Add a dedicated ACP Skill Run panel for `skillrunner.job.v1` jobs executed through ACP backends.
- Add a host-side ACP skill run store keyed by `requestId`, separate from ACP chat conversations.
- Extend the ACP SkillRunner-compatible orchestrator to publish stage snapshots for workspace, materialization, dependency injection, ACP session, prompt execution, repair, validation, success, failure, and cancellation.
- Add two entry points: Task Dashboard Home and a Zotero side-pane button.
- Route ACP `skillrunner.job.v1` task rows to the new panel instead of ACP chat or SkillRunner REST run panel.

## Capabilities

### New Capabilities
- `acp-skillrunner-run-panel`: Dedicated UI, store, and host bridge for observing ACP SkillRunner-compatible workflow runs.

### Modified Capabilities
- None.

## Impact

- Affects ACP provider/orchestrator internals, dashboard home/task routing, Zotero side-pane shell, and dashboard static assets.
- Does not change `skillrunner.job.v1`, workflow manifests, `buildRequest()`, or `applyResult()`.
