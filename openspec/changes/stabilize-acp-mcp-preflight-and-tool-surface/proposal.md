# Stabilize ACP MCP Preflight and Tool Surface

## Why

Topic synthesis ACP runs can waste a full agent turn initializing their run-local
SQLite runtime before discovering that Zotero MCP was not injected or is missing
required tools. The public MCP tool surface also still exposes
`synthesis.read_paper_artifacts`, which can return very large artifact payloads
and destabilize the MCP transport.

## What Changes

- Add runner-declared `mcp.required_tools` preflight before the first ACP prompt.
- Fail create/update topic synthesis runs early when HTTP MCP is unavailable,
  the embedded Zotero MCP server cannot start, or required tools are missing.
- Remove `synthesis.read_paper_artifacts` from public MCP `tools/list` and
  direct `tools/call` routing.
- Keep internal artifact reading available for manifest/export implementation.
- Keep `synthesis.export_paper_artifact_bundle` as the only public topic
  synthesis artifact payload path.

## Impact

- Affects ACP SkillRunner-compatible execution.
- Affects Zotero MCP tool registry and synthesis MCP tests.
- Affects create/update topic synthesis skill package instructions.
- Does not introduce the planned HostAPI CLI bridge.
