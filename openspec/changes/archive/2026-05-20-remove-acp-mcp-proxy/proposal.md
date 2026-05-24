## Why

The host-side MCP smoke gateway/proxy path broke ACP tool discovery and formal
MCP calls across recent runs. It also adds a transport boundary that ACP
backends are not required to tolerate consistently.

This change removes the unarchived gateway change, restores direct MCP
descriptor injection, and makes host-side required-MCP preflight the only
blocking MCP readiness gate before ACP business prompts.

## What Changes

- Remove the unarchived `stabilize-acp-mcp-smoke-gateway` change artifacts so
  they cannot be archived into the main specs later.
- Remove the ACP MCP gateway/proxy runtime and tests.
- Restore ACP session setup to pass the embedded Zotero MCP descriptor directly
  to the ACP backend.
- Stop sending blocking callable-smoke prompts for required-MCP runs.
- Keep required-MCP preflight and the business prompt guard.
- Keep the prompt-chain recovery fix so a rejected recovered reply does not
  poison later replies.

## Capabilities

### Removed / Superseded

- The unarchived `acp-mcp-smoke-gateway` capability is abandoned and must not be
  archived.
- Blocking ACP callable smoke, smoke hard timeout, smoke-prompt behavior, and
  smoke-failure diagnostic requirements are removed from `zotero-mcp-tool-suite`.

### Modified

- `acp-embedded-zotero-mcp-server`: injected MCP descriptors are direct
  descriptors for the embedded Zotero MCP endpoint and must not be proxy-wrapped.
- `zotero-mcp-tool-suite`: required-MCP runs rely on preflight plus the MCP
  guard, not a separate smoke turn.
- `acp-skillrunner-compatible-runner`: recovered replies must recover from a
  failed prompt chain.

## Impact

- Code: ACP connection adapter, ACP SkillRunner orchestration, runtime prompt
  template registry, MCP smoke diagnostics, gateway module, gateway tests, and
  affected prompt text.
- Runtime behavior: required-MCP ACP skill runs no longer spend a turn on smoke
  and no longer route MCP traffic through a local proxy.
- Compatibility: host-injected Zotero MCP uses the backend's advertised HTTP MCP
  support directly; agent-private MCP configuration remains out of scope.
