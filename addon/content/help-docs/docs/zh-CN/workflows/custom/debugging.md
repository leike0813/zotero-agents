# 调试与测试

编写自定义 workflow 后，可以使用以下方法来验证和调试。

## 启用调试模式

在偏好设置中启用调试模式，可以解锁额外的调试工具和信息显示：

Zotero → 设置 → Zotero Agents → 启用调试模式

调试模式开启后：

- Dashboard 中会显示调试相关的 workflow
- 运行时日志会更加详细
- 部分诊断工具变为可用

## 使用 Debug Probe 工具包

插件内置了 `workflow-debug-probe` 调试工具包，包含多个诊断 workflow：

| Workflow | 用途 |
|---------|------|
| **Workflow Debug Probe** | 检查 workflow 预执行状态，打开诊断面板 |
| **Debug Sequence Linear Probe** | 验证串行执行和默认 handoff 传递 |
| **Debug Sequence Workspace Reuse Probe** | 验证跨步骤的工作区复用 |
| **Debug Sequence Context Isolation Probe** | 验证显式 handoff 过滤和隔离工作区 |

这些 workflow 在 Dashboard 的 workflow 列表中可见（调试模式下），可以直接运行来验证序列执行机制。

## 日志查看

### Runtime Logs

Workflow 执行期间会产生运行时日志，在 Dashboard 中可以查看：

1. 打开 Dashboard
2. 找到正在运行或已完成的任务
3. 点击"查看日志"展开日志面板

### 在 Hook 中写入日志

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // 写入运行时日志
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Processing parent: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // 对于复杂的调试信息，可以使用 console
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## 常见问题排查

### Workflow 未出现在 Dashboard 中

1. 检查 `workflow.json` 是否放置在正确的目录下
2. 确认 `workflow.json` 格式正确（JSON 语法）
3. 检查 `id` 是否唯一，不与官方 workflow 冲突
4. 确认 `applyResult` 脚本路径正确
5. 查看插件错误日志（Zotero → 帮助 → 故障排除 → 查看日志文件）

### filterInputs 返回 null

如果 `filterInputs` 返回 `null`，表示没有符合条件的选择，workflow 不会执行。检查过滤逻辑是否正确。

### buildRequest 与声明式 request 冲突

`buildRequest` hook 和 `workflow.json` 中的 `request` 字段**互斥**。如果两者同时存在，`buildRequest` 优先。如果发现请求行为不符合预期，检查是否无意中同时定义了二者。

### Hook 脚本执行失败

- 确认 Hook 脚本是 `.mjs`（ES Module）格式
- 确认导出了正确的函数名：`filterInputs`、`buildRequest`、`applyResult`
- 确认函数签名正确接收了 `{ parent, bundleReader, runtime }` 等参数
- 检查相对导入路径是否正确

### 结果未写入 Zotero

`applyResult` 中使用了 `hostApi.mutations.execute()` 但未生效，可能原因：

- 写操作需要用户审批，但审批弹窗被忽略或超时
- 在 `execution.zoteroHostAccess.required` 未设 `true` 时尝试了写操作
- `allowWriteApprovalBypass` 需要与插件权限配置配合使用

## 开发建议

### 从简单开始

1. 先用 `pass-through` provider 和最小的 `applyResult` 验证 workflow 加载成功
2. 逐步添加 `filterInputs` 和 `buildRequest`
3. 最后接入实际后端

### 使用 notifications.toast 快速反馈

```js
hostApi.notifications.toast({
  text: `filterInputs 收到 ${selectionContext.items.parents.length} 个父条目`,
  type: "default",
});
```

这是快速的调试手段，无需查看日志即可看到执行效果。

### 参考官方 Workflow

官方 workflow 是最好的学习参考。安装官方包后可以在 `<Zotero Data>/zotero-agents/content/official/workflows/` 目录下查看源代码：

- `literature-workbench-package/literature-analysis/` — 完整的 skillrunner.job.v1 示例
- `content/official/workflows/literature-workbench-package/export-notes/` — 简单的 pass-through 示例
- `content/official/workflows/mineru/` — 带 buildRequest + 文件处理的示例
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — 交互模式示例

## 下一步

- [完整 Workflow 清单参考](#doc/workflows%2Fcustom%2Fmanifest) — workflow.json 所有字段
- [Host API 参考](#doc/workflows%2Fcustom%2Fhost-api) — 在 hook 中可用的全部 API
