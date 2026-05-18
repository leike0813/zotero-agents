# Design

## ACP MCP Preflight

Skills may declare required Zotero MCP tools in `assets/runner.json`:

```json
{
  "mcp": {
    "required_tools": ["synthesis.list_topics"]
  }
}
```

The ACP SkillRunner orchestrator reads this list after skill materialization and
before the first prompt. If the list is empty, existing behavior is unchanged.
If non-empty, the runner initializes the ACP adapter to check HTTP MCP
capability, ensures the embedded Zotero MCP server can start, lists local MCP
tool definitions, and verifies every declared tool exists.

Failure is terminal and happens before `newSession()` / first prompt. This keeps
the agent from spending time on run-local DB initialization when required host
tools cannot be injected.

## Tool Surface Reduction

`synthesis.read_paper_artifacts` is no longer a public MCP tool. It remains an
internal service method because `synthesis.get_paper_artifact_manifest` and
`synthesis.export_paper_artifact_bundle` reuse the same host decoder path.

Agents should use:

- `synthesis.get_paper_artifact_manifest` for bounded availability diagnostics.
- `synthesis.export_paper_artifact_bundle` for full artifact payload export to
  the ACP run directory.

The export tool response remains a compact receipt and must not return payload
bodies or hash-bearing artifact content to the LLM.
