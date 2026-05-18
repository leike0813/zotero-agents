# Workflow MCP Contract and ACP Callable Smoke

## Why

Topic synthesis workflows depend on local Zotero MCP tools. Runner-level MCP
preflight verifies the host MCP registry, but it does not prove that the ACP
session exposes the corresponding `mcp__zotero__...` callable tools in the
agent turn. Recent runs showed host preflight and MCP `tools/list` succeeding
while the first agent turn still reported `No such tool available`.

## What Changes

- Add workflow-level backend support and required MCP tool declarations.
- Restrict create/update topic synthesis workflows to ACP backends.
- Run host MCP availability checks and ACP callable smoke only for workflows
  declaring required MCP tools.
- Inject a short prompt guard telling the agent not to perform MCP environment
  discovery after host checks pass.
- Remove MCP environment-discovery instructions from create/update topic
  synthesis skills.

## Impact

- Affects workflow schema/type contracts and backend selection.
- Affects ACP SkillRunner-compatible orchestration.
- Affects create/update topic synthesis workflow manifests and skill text.
- Does not change Zotero MCP business tool implementations or topic synthesis
  persistence/UI.
