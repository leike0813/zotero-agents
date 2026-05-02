# Govern ACP Skills Runtime Options

## Why

ACP Skills need model, mode, and reasoning choices, but ACP backends only expose those choices after a live connection. Without a cached connection-test step, workflow submission cannot reliably present valid ACP runtime options or guarantee that a configured backend is usable.

## What Changes

- Add an ACP backend connection test that also refreshes runtime option cache.
- Require ACP Skills/workflow execution to use an ACP backend with a passing, current connection test.
- Expose cached ACP mode/model/reasoning options in workflow submission settings.
- Freeze selected ACP runtime options for each run and display them in ACP skill run UI.
- Keep ordinary ACP Chat usable without enforcing connection-test status.

## Capabilities

### New Capabilities

- `acp-skills-runtime-options`: Governs ACP backend connection tests, cached runtime options, workflow submission options, and per-run frozen ACP mode/model settings.

### Modified Capabilities

- None.

## Impact

- Backend registry and manager persist ACP test/cache metadata.
- Workflow settings use cached ACP options for `skillrunner.job.v1` on ACP backends.
- ACP SkillRunner-compatible runner applies selected mode/model before prompting.
- ACP skill run store and panel show frozen runtime options.
