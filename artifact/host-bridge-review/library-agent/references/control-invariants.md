# Host Bridge 控制不变量

在所有 Host Bridge Agent 面向的表面（surface）中使用以下协议级规则。

## Handle

- 将 Zotero 对象引用、主题 ID、Product ID、文件 ID、workflow ID、`workflowRunId`、`skillRunId`、`agentRunId` 和 `agentRequestId` 视为不透明的 typed handle。
- 使用 `workflowRunId` 查询 Host 拥有的 workflow 状态和取消操作。
- 使用显式的 `skillRunId` 进行 skill-run 回复、重连和 skill 事件读取。
- 仅在 Agent 拥有的工作的 apply-back session 中使用 `agentRunId`，并与其声明的 `agentRequestId` 值配对。
- 绝不要用一种 handle 类型替代另一种，也不要通过解析显示文本来恢复缺失的 handle。

## 权限与 Approval

- 读取不授予写入权限。
- Provider 权限策略控制单次提交运行的 backend 工具权限；它不批准 Zotero 写入。
- Mutation 和 workflow apply-back 仍然受 Host Bridge approval 和当前就绪状态检查的约束。
- 遇到拒绝时停止。不要通过原始调用、直接存储访问或不同的命令族来绕过边界。

## Workflow 所有权

- `workflow submit` 启动 Host 拥有的执行并返回 `workflowRunId`。
- `workflow agent-run` 准备本地交接并返回 `agentRunId` 及请求合约；它不启动 Host backend 运行。
- `workflow agent-apply` 通过准备好的 `agentRunId` 合约应用最终确定的 Agent 拥有的结果包。
- 在声明的边界处验证选择、workflow 选项、provider profile、结果包和 apply 就绪状态，而非假设先前的验证仍然有效。

## 文件与制品

- 将 `fileId` 和 broker 下载 handle 视为不透明的、可能短生命周期的。
- 当精确制品身份重要时，验证声明的大小或校验和。
- 在 Host mutation 中引用本地文件之前先上传；不要将任意本地路径作为 Zotero mutation 目标传递。
- 将生成的路径和证据位置视为定位器。稳定的引用和摘要在交接过程中承载身份信息。

## 隐私与输出

- 将凭据、授权头、完整 transcript、provider 私有 payload 和 Agent 私有状态排除在可移植证据之外。
- 优先使用结构化错误码、typed handle、游标元数据和制品摘要，而非复制的日志或推断的状态。
- 将缓存的、分页的或生成的数据视为性能或交接辅助手段，而非当前 Zotero 事实的来源。
