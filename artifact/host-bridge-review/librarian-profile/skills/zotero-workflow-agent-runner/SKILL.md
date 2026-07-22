---
name: zotero-workflow-agent-runner
description: 当 Zotero Librarian 任务应由 Hermes Agent 通过 `zotero-bridge workflow agent-run` 执行时使用，特别是 workflow 级别或弱 Zotero 上下文的交接，如文献搜索摄入准备。
license: AGPL-3.0-or-later
---

# Zotero Workflow Agent Runner

当 Host Bridge workflow 交接需要 Agent 拥有时使用此 skill。它准备或消费 `workflow agent-run` 包，完成本地请求合约，并仅在交接需要 apply-back 时应用结果。

## 第一步

1. 阅读 `../zotero-librarian/references/workflow-execution-policy.md` 确认 Agent 拥有的执行是否合适。
2. 在打开或执行交接包之前阅读 `references/agent-run-playbook.md`。
3. 当将用户请求映射到已知的 librarian workflow 时，使用 `../zotero-librarian/references/common-tasks.md`。
4. 当 handle、artifact 或 workflow 术语有歧义时，使用 `../zotero-librarian/references/terminology.md`。

## 职责

### 必须由 LLM 完成

- 判断 workflow 请求是否可以作为 Agent 拥有的交接处理。
- 解释交接请求和输出合约。
- 执行请求的本地 skill 工作或根据请求合约委托执行。
- 判断已完成的结果是否准备好进行 `workflow agent-apply`。

### 必须由脚本完成

- 规范化 workflow 选择引用。
- 构建非阻塞 workflow 计划。
- 提交 `workflow agent-run` 并返回下载的包路径。
- 验证确定性 JSON 输入并渲染稳定的 stdout。

### 禁止事项

- 不要将 `agentRunId` 视为 `workflowRunId`。
- 不要通过 `run active`、`run get` 或通知收件箱监控 Agent 拥有的交接。
- 当请求合约提供了包规则时，不要手写结果包结构。
- 当 workflow 明确为 Agent 拥有且本地执行合适时，不要仅因为 Host 拥有的提交可用就使用它。

## 最小命令集

准备计划：

```powershell
scripts/zotero_librarian_workflow_service.py plan --workflow <workflowId> --mode agent --items .\items.json
```

启动一个 Agent 拥有的交接（不等待）：

```powershell
scripts/zotero_librarian_workflow_service.py submit --plan .\plan.json
```

仅在交接合约要求时应用已完成的结果包：

```powershell
zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>
```
