# Change: Separate Workflow Runtime Options From Skill Parameters

## Why

Workflow manifest `parameters` currently serve two different purposes: user-configurable workflow settings and provider-facing skill parameters. This causes local apply-time switches such as `literature-digest.auto_reference_matching` to leak into the skill/agent input even though they should only control Zotero Skills runtime post-processing.

## What Changes

- Add a manifest-level way to mark selected workflow parameters as runtime-only.
- Keep runtime-only parameters visible and configurable through workflow settings.
- Exclude runtime-only parameters from provider request payloads such as `request.parameter`.
- Preserve runtime-only values in the local execution/apply context so workflow hooks can use them after provider execution.
- Mark `literature-digest.auto_reference_matching` as a runtime-only workflow option.

## Capabilities

### New Capabilities

### Modified Capabilities

- `workflow-manifest-authoring-schema`: workflow parameter declarations can mark a parameter as runtime-only.
- `workflow-execution-pipeline`: workflow execution preserves runtime-only parameters locally while preventing them from being dispatched to providers.
- `literature-workbench-package`: `literature-digest.auto_reference_matching` is governed as a workflow runtime option rather than a skill parameter.

## Impact

- Code: workflow manifest schema/types, declarative request compiler, workflow result/apply context, literature-digest apply hook.
- Runtime behavior: skill/agent requests no longer include runtime-only workflow parameters.
- Tests: manifest schema, request compilation, apply context, literature-digest auto matching regression.
