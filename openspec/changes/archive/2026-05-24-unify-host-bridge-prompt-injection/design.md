# Design

## Workflow Declaration

Workflows express product intent with:

```json
{
  "execution": {
    "zoteroHostAccess": {
      "required": true
    }
  }
}
```

The field name intentionally avoids binding the workflow protocol to the current Host Bridge CLI implementation. Missing `execution.zoteroHostAccess` is treated as `required: true`, matching current ACP skill behavior where Zotero host access is generally expected.

The ACP request adaptation layer injects:

```json
{
  "runtime_options": {
    "zotero_host_access": {
      "required": true
    }
  }
}
```

This runtime option is internal transport metadata for the ACP runner. It is not
sent to the legacy SkillRunner backend while
`SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS` remains false.

## Orchestrator Injection

The ACP skill runner resolves requirement priority as:

1. `request.runtime_options.zotero_host_access.required`
2. default `true`

When required, the orchestrator performs the existing Host Bridge CLI injection:

- `.zotero-bridge/profile.json`
- `.zotero-bridge/README.md`
- `.zotero-bridge/bin/zotero-bridge` and `.cmd`
- backend env variables
- system prompt snippet

When disabled, the orchestrator records a host-access disabled event and does not materialize `.zotero-bridge`, does not modify backend env, and does not append Host Bridge prompt text.

## ACP Chat

ACP Chat is not controlled by workflow declarations. It always needs Zotero host access, so the ACP session manager materializes Host Bridge CLI profile/README/shims before creating the ACP adapter, injects the resulting backend environment, and appends the same Host Bridge prompt snippet to every chat prompt. There is no ACP Chat opt-out and no MCP fallback.

## Engine Instruction File

The existing run execution instruction materialization continues to choose the file name by ACP agent family:

- Codex/default: `AGENTS.md`
- Claude Code: `CLAUDE.md`
- Gemini: `GEMINI.md`

If a Host Bridge prompt snippet exists, the exact same snippet is appended with stable markers:

```text
<!-- zotero-skills-zotero-host-access:start -->
...
<!-- zotero-skills-zotero-host-access:end -->
```

This is a fallback for agents that pay more attention to workspace instruction files than initial system/user prompt text. It is not a new source of truth.

## Skill Cleanup

Built-in skills should describe workflow-specific operations and failure branches, not generic environment setup. MCP required tool declarations and old MCP preflight wording are removed from non-submodule built-in skill packages. Topic synthesis skills may still explain the business-level canceled branch for unavailable `zotero-bridge synthesis` calls.
