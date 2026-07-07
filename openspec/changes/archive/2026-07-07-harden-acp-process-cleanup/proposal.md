## Why

ACP backends launched through wrappers such as `uv` can leave child agent
processes behind when the plugin only kills the direct wrapper process. Zotero
startup already centralizes command and environment preflight, so process tree
cleanup capability should be detected there once instead of being probed during
every transport close.

## What Changes

- Add startup process-control preflight alongside runtime command and
  environment preflight.
- Emit one structured `info` runtime log for each startup preflight stage:
  command, environment, and process-control.
- Use the cached process-control snapshot when ACP transports decide how to
  terminate wrapper-prone local backends.
- Preserve existing command resolution, launch-plan construction, subprocess
  environment precedence, and ACP stdout protocol ownership.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-platform-services`: Add startup process-control capability detection
  and preflight logging requirements.
- `acp-skillrunner-compatible-runner`: Require ACP SkillRunner-compatible local
  backend cleanup to account for wrapper process trees without changing launch
  plan or stdout ownership.
- `acp-chat-session-management`: Require ACP Chat disconnect/shutdown cleanup to
  release local transport process trees when those transports are managed by the
  plugin.

## Impact

- Platform services: command/env startup preflight sequencing and new
  process-control snapshot APIs.
- ACP transports: close path gains cached process tree cleanup diagnostics and
  strategy selection.
- Tests/specs: focused regression coverage for preflight logs, cached
  capability use, wrapper-prone cleanup diagnostics, and stdout ownership.
