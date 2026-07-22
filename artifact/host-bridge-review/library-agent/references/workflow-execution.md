# Workflow 执行

## 选择所有权

从 `executionModes` 或 `workflow describe` 中读取 `workflow requirements`；不要从 provider 名称或说明文字推断所有权支持。

当 Host Bridge 和已配置的 backend 应拥有执行时使用 `workflow submit`。保留返回的 `workflowRunId`，并在回复或重连之前获取显式的 `skillRunId` 值。

当当前 Agent 应在本地执行准备好的请求时使用 `workflow agent-run`。下载的交接包含经过清理的上下文、请求元数据、输出合约和权威的输出合约工具包。返回的 `agentRunId` 是 apply-back session 句柄，而非正在运行的 Host 任务。

当 `executionModes.agentOwned.supported` 为 false 时，不要选择 Agent 拥有的执行。特别是，`workflow agent-run` 不接受 workflow 选项或 provider profile。

## 准备输入

1. 检查 workflow 描述和选择合约。
2. 当请求使用指示性语言时，解析当前 Zotero 上下文。
3. 将 workflow 选择规范化为所需的父条目引用。
4. 仅在 workflow 选项中放置参数值。使用 `workflow validate` 验证；该命令不接受 provider profile。
5. 使用 `workflow profile list|describe|validate` 分别发现和验证 backend 拥有的选项。仅当已验证 profile 的 backend 满足 workflow 的 provider 需求时才复用。
6. 仅在 `workflow submit` 中传递两个独立输入。显式的 profile 覆盖 `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`；环境默认值是当前进程状态，而非 Zotero 配置。
7. 默认使用单次 backend 提交，除非用户显式授权更高的并发度。

## Host 拥有的执行

1. 提交 workflow 并记录其 `workflowRunId`。
2. 使用有界的 `run get`、近期历史、通知列表或显式 skill-run 事件获取当前状态。
3. 仅当返回的 `run skill reply|connect` 的操作标志允许该操作时，使用 `skillRunId`。
4. 仅使用 workflow handle 进行 `run cancel`，并报告取消意图可能先于终态。

## Agent 拥有的执行

1. 使用显式输出目录运行 `workflow agent-run`。
2. 读取 `agent-run/context.json` 和每个相关的 `agent-run/requests/*/output-contract.json`。
3. 使用提供的上下文和 Skill 包执行请求的本地工作。
4. 使用捆绑的输出合约工具包或该合约的等效实现最终确定每个结果。
5. 可选地使用 `scripts/zotero_library_agent.py workflow ...` 检查交接和验证结果。
6. 仅在审查结果和写入意图后，使用 `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` 应用已完成的结果。
7. 在任何中断、失败或多结果 apply 之后，查询 `workflow agent-apply-status <agentRunId>` 以在决定恢复是否安全之前获取 receipt。

不要对 `agentRunId` 使用运行控制命令，不要将 Agent 拥有的工作作为 Host 运行监控，也不要在存在输出合约时手工构建结果命名空间。

## 完成

在当前任务的证据中记录所有权模式、相关的 typed handle、最终状态、结果包路径和任何已应用的写回。在返回任务结果后，不要保留私有的后台监控。
