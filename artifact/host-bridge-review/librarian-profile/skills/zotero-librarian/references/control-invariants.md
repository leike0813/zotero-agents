# Host Bridge 控制不变量

在所有 Host Bridge Agent 面向的 surface 中使用这些协议级规则。

## Handle

- 将 Zotero 对象引用、topic ID、product ID、file ID、workflow ID、`workflowRunId`、`skillRunId`、`agentRunId` 和 `agentRequestId` 视为不透明的类型化 handle。
- 使用 `workflowRunId` 进行 Host 拥有的 workflow 状态查询和取消。
- 使用显式的 `skillRunId` 进行 skill-run 回复、重连和 skill 事件读取。
- 仅将 `agentRunId` 用作 Agent 拥有的工作的 apply-back session，与其声明的 `agentRequestId` 值配对。
- 永远不要用一种 handle 类型替代另一种，也不要通过解析显示文本来恢复缺失的 handle。

## 权威与 Approval

- 读取不授予写入权限。
- Provider permission 策略控制一个已提交运行的 backend 工具权限；它不批准 Zotero 写入。
- Mutation 和 workflow apply-back 仍然受 Host Bridge approval 和当前 readiness 检查的约束。
- 在拒绝时停止。不要通过原始调用、直接存储访问或不同的命令族来绕过边界。

## Workflow 所有权

- `workflow submit` 启动 Host 拥有的执行并返回 `workflowRunId`。
- `workflow agent-run` 准备本地交接并返回 `agentRunId` 加请求合约；它不启动 Host backend 运行。
- `workflow agent-apply` 通过准备好的 `agentRunId` 合约应用已完成的 Agent 拥有的结果包。
- 在声明的边界处验证选择、workflow 选项、provider profile、结果包和 apply 就绪状态，而不是假设先前的验证仍然有效。

## 文件与 Artifact

- 将 `fileId` 和 broker 下载 handle 视为不透明且可能短期有效的。
- 当精确的 artifact 身份很重要时，验证声明的大小或校验和。
- 在 Host mutation 中引用本地文件之前先上传它们；不要将任意本地路径作为 Zotero mutation 目标。
- 将生成的路径和证据位置视为定位器。稳定的引用和摘要在交接中传递身份。

## 隐私与输出

- 将凭证、授权头、完整 transcript、provider 私有的 payload 和 Agent 私有的状态排除在可移植证据之外。
- 优先使用结构化错误代码、类型化 handle、cursor 元数据和 artifact 摘要，而不是复制日志或推断状态。
- 将缓存、分页或生成的数据视为性能或交接辅助，而非当前 Zotero 事实的来源。
