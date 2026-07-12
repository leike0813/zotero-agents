## Why

Kilo ACP advertises `none` as a reasoning-effort option even though some
selected models reject it. The rejection occurs before prompting and currently
fails an ACP Skill run or Chat configuration action outright.

## What Changes

- Safely omit Kilo's rejected `thought_level=none` setting when the ACP server
  reports an invalid-parameters error, allowing the selected model's default
  reasoning behavior to continue in the same session.
- Apply the same fallback to ACP Skills launch/recovery and ACP Chat's manual
  effort selection, while retaining all other configuration errors.
- Persist and audit the effective fallback so recovery does not resubmit the
  rejected override.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-model-effort-selector`: define safe Kilo `none` handling for interactive
  effort selection.
- `acp-skillrunner-compatible-runner`: define pre-prompt Kilo reasoning
  fallback and recovered-run behavior.

## Impact

- ACP runtime-option application in Chat and SkillRunner-compatible execution.
- ACP configuration-error handling, run diagnostics, persisted runtime options,
  and focused regression tests.
