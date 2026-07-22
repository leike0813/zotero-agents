# Host Bridge 控制不变量

在每个 Host Bridge Agent 面向的 surface 中使用这些协议级规则。

## Handle

- 将 Zotero 对象引用、主题 ID、Product ID、文件 ID、workflow ID、`workflowRunId`、`skillRunId`、`agentRunId` 和 `agentRequestId` 视为不透明的类型化 handle。
- 使用 `workflowRunId` 获取 Host 管理的 workflow 状态和取消。
- 使用显式 `skillRunId` 进行 skill-run 回复、重连和 skill 事件读取。
- 仅将 `agentRunId` 用作 Agent 管理工作的 apply-back session，与其声明的 `agentRequestId` 值配对。
- 绝不在一种 handle 类型和另一种之间替换，也不要通过解析显示文本来恢复缺失的 handle。

## 权限与 Approval

- 读取不授予写入权限。
- Provider 权限策略控制一次提交运行的 backend 工具权限；它不批准 Zotero 写入。
- Mutation 和 workflow apply-back 仍受 Host Bridge approval 和当前就绪检查约束。
- 被拒绝时停止。不要通过 raw 调用、直接存储访问或不同的命令族来绕过边界。

## Workflow 所有权

- `workflow submit` 启动 Host 管理的执行并返回 `workflowRunId`。
- `workflow agent-run` 准备本地交接并返回 `agentRunId` 加请求合约；它不启动 Host backend 运行。
- `workflow agent-apply` 通过已准备好的 `agentRunId` 合约应用已最终确定的 Agent 管理结果包。
- 在声明的边界验证选择、workflow 选项、provider profile、结果包和 apply 就绪状态，而不是假设之前的验证仍然有效。

## 文件与 Artifact

- 将 `fileId` 和代理下载 handle 视为不透明的、可能短期的。
- 当需要精确的 artifact 身份时，验证声明的大小或校验和。
- 在 Host mutation 中引用本地文件之前先上传；不要将任意本地路径作为 Zotero mutation 目标。
- 将生成的路径和证据位置视为定位器。稳定的引用和摘要在交接中承载身份。

## Operation Receipt 与恢复

- 每个状态变更请求都携带不透明的 `operationId`。在持久化 operation receipt 终止前一直保留它。
- 响应传输失败后，在重试前检查 `operation get <operationId>`。缺少响应意味着 `stateChange: unknown`，并非 unchanged。
- 将 `stateChange` 解读为 `unchanged`、`changed` 或 `unknown`，将 `handleConsumption` 解读为 `unconsumed`、`consumed` 或 `unknown`。不得把 unknown 折叠成 Boolean 默认值。
- 一个 `operationId` 不得用于不同输入。`fileId`、`agentRunId` 等领域 handle 与 operation receipt handle 彼此独立。

## Surface 身份

- SemVer 差异仅供参考。用当前 CLI help 确认所需命令。
- build fingerprint 或 command catalog checksum 不同，意味着内置命令卡可能过期。对当前任务所需命令使用当前 CLI 的 `surface describe` 和 `surface search`。
- protocol 或 CLI schema 不同，需要逐命令确认 argv、approval、handle、effect 和 recovery。仅在所需命令缺失或其控制合约无法确认时停止。
- Effect 可以有多个。例如，`workflow agent-apply` 同时修改 workflow-control 状态和 Zotero 文献库；approval 本身不能描述完整 effect。

## 隐私与输出

- 将凭证、授权头、完整 transcript、provider 私有 payload 和 Agent 私有状态排除在可移植证据之外。
- 优先使用结构化错误代码、类型化 handle、cursor 元数据和 artifact 摘要，而非复制的日志或推断的状态。
- 将缓存的、分页的或生成的数据视为性能或交接辅助，而非当前 Zotero 真实状态的数据源。
