# Change: unify-host-bridge-prompt-injection

## Summary

Unify Zotero host access injection for ACP skill runs. Workflows declare whether Zotero host access is required through `execution.zoteroHostAccess.required`, defaulting to required. The ACP skill runner orchestrator becomes the single owner of Host Bridge CLI profile/README/shim/env and prompt snippet injection, and writes the same host access snippet into the engine instruction file as a workspace-local fallback.

## Motivation

Host Bridge CLI is now the default ACP host access path, but host-related instructions are still split across workflow runtime options, system prompts, injected workspace files, and built-in skill prose. Some built-in skills also retain old MCP availability/tool wording. This makes agent behavior inconsistent and makes it harder to audit the real host access contract.

## Scope

- Add `execution.zoteroHostAccess.required` to workflow manifests and propagate it as `runtime_options.zotero_host_access.required`.
- Default missing declarations and direct ACP skill runs to `required: true`.
- Skip all Host Bridge CLI materialization, backend env injection, and prompt snippet injection when `required: false`.
- Append the same Host Bridge system prompt snippet to `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` with stable markers.
- Keep Zotero host access always enabled for ACP Chat sessions.
- Clean built-in skill and workflow packages so generic MCP/Host Bridge environment prose lives only in centralized runtime prompt templates.

## Non-Goals

- Do not delete MCP server/protocol implementation or explicit compatibility diagnostics.
- Do not re-enable MCP preflight, MCP guard prompts, or MCP fallback.
- Do not write Host Bridge instructions into proxy `SKILL.md`.
- Do not change Host Bridge CLI command behavior.
