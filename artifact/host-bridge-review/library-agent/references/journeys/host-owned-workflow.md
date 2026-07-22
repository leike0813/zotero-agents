# Host 拥有的 Workflow

当 Host Bridge 或其配置的 backend 应拥有执行并暴露可监控的 `workflowRunId` 时使用本旅程。

## 准备与提交

1. `workflow list` 发现候选项；它不能证明 workflow 接受当前输入。
2. `workflow describe` 或 `workflow requirements` 仅返回 workflow 拥有的选择、workflow 选项、provider 需求、用途和执行模式事实。
3. 将子引用规范化为顶层条目引用，并使用预期的选择和 workflow 选项运行 `workflow validate`。Provider profile 输入在 workflow describe 和 validate 上无效。
4. 分别使用 `workflow profile list`、`workflow profile describe --backend <id>` 和 `workflow profile validate --provider-profile <JSON_OR_FILE>` 处理 backend 拥有的 provider 选项。这些命令不接受 workflow id。
5. 检查已验证的 profile 是否满足 workflow 的 provider 需求。`workflow submit` 执行相同的兼容性预检，是两个合约的唯一汇合点。
6. 仅当 `executionModes.hostOwned.supported` 为 true 时提交。分别传递 workflow 选项和 provider profile，并保留 `workflowRunId`。

显式的 `--provider-profile` 始终优先。否则 CLI 可能注入 `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`，其值为内联 JSON 或 `@` 后跟 profile 的绝对路径。该默认值属于当前 Agent/CLI 进程；Zotero 不保存它，也从不将其应用于 Agent 拥有的交接。

## 监控与交互

使用 `run get <workflowRunId>` 获取权威运行状态。活动/近期列表仅用于发现。如果状态暴露了 `skillRunId`，在回复/连接之前检查该精确的 skill run。权限读取是观察性的；approval 在 Host UI 中进行。通知事件是进度信号，不是 transcript 或授权。

## 完成证据

终态 workflow 状态证明执行已结束，但不证明每个预期的 Product 都存在。对于 Dashboard 输出，列出/获取 `productId`，然后下载所选资产并验证。记录运行 id、终态、相关的 skill/permission/event handle 和 Product 证据。

## 恢复

取消是意图，不是立即完成；重新读取运行状态。在提交不确定时，使用 workflow/backend 过滤器搜索近期 workflow 运行，然后再创建新运行。绝不用此控制平面监控返回的 `agentRunId`。
