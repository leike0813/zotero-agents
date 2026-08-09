## Why

ACP Chat can discover every whitelisted Skill on Windows yet fail to materialize
any of them because a path normalized for containment comparison is passed to
Zotero's native file APIs as `C:/...`. Zotero may reject that drive-path form,
leaving the managed manifest populated while the workspace Skill roots remain
empty.

## What Changes

- Preserve native local paths when ACP Chat resolves managed Skill targets.
- Normalize native paths again at the runtime directory-copy boundary before
  staging, promotion, or Zotero file-object fallback.
- Report ACP Chat Skill injection as ready only when every planned target was
  materialized without missing registry entries or copy failures.
- Add regression coverage for Zotero's Windows drive-path behavior and partial
  ACP Chat materialization.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-session-management`: Managed Skill targets must retain native
  filesystem path syntax and readiness must reflect actual materialization.

## Impact

- ACP Chat workspace preparation and structured diagnostics.
- Shared runtime directory-copy path handling.
- No whitelist, content package, backend root, protocol, or dependency changes.
