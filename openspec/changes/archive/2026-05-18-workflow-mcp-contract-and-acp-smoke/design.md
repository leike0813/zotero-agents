# Design

## Workflow Contract

Workflows may declare execution constraints:

```json
{
  "execution": {
    "supportedBackends": ["acp"],
    "mcp": {
      "requiredTools": ["synthesis.list_topics"]
    }
  }
}
```

`supportedBackends` filters backend resolution. When absent, existing provider
and request-kind inference remains unchanged.

`execution.mcp.requiredTools` is the preferred required-MCP source. Runner-level
`assets/runner.json#mcp.required_tools` remains a compatibility fallback for one
transition period, but workflow declarations take precedence when present.

## ACP Callable Smoke

For ACP skill runs with required MCP tools, orchestration performs:

1. Host availability check: HTTP MCP support, embedded Zotero MCP startup, and
   host registry contains all required tools.
2. ACP session creation or recovery.
3. Mode/model selection.
4. Callable smoke prompt before the business prompt.

The smoke prompt asks the agent to call every declared required tool once and
return a compact JSON marker. The host does not trust the marker. It listens for
Zotero MCP diagnostics during the smoke turn and requires each declared tool to
reach the embedded MCP server as a `tools/call`. Tool-level validation failures
count as callable exposure if the request reached Zotero MCP; missing local
callables (`No such tool available`) or no matching `tools/call` fail the run.

## Agent Guard

After smoke succeeds, the business prompt includes a short guard:

> Host 已完成 MCP availability check 和 callable smoke。不要自行搜索 MCP 配置或测试工具注入状态。如果正式执行中某个必需 MCP tool call 返回 unavailable/no such tool，则立即输出合法 canceled，不要自行排查环境。

The guard is injected by orchestration for workflow-declared required MCP tools,
so skill bodies do not need to perform MCP preflight or environment discovery.
