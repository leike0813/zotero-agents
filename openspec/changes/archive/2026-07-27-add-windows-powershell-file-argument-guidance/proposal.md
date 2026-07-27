## Why

When a Windows ACP agent invokes a command-line tool or script through PowerShell, inline values containing JSON, paths, quotes, or shell-sensitive characters can be altered by shell parsing before the target tool receives them. Many supported CLIs accept an `@file` form that avoids this extra quoting boundary.

## What Changes

- Add identical guidance to the packaged ACP Chat and ACP Skills startup preambles: when PowerShell invokes a CLI or script and the target supports it, prefer its `@file` argument form for structured or path-containing values instead of inline command-line values.
- Keep the instruction conditional on target-tool support; it does not prescribe an unsupported syntax or alter command execution.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-session-management`: The packaged ACP Chat startup preamble must include conditional `@file` guidance for PowerShell command-line invocations.
- `acp-skillrunner-compatible-runner`: The packaged ACP Skills startup preamble must include the same conditional `@file` guidance.

## Impact

- Packaged ACP runtime prompt templates for ACP Chat and ACP Skills.
- Existing runtime prompt-template rendering test.
- No ACP protocol, backend configuration, CLI contract, or dependency changes.
