
# src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts -->

语义 trace 录制器：独占运行时诊断模式，维护 owner/request 生命周期与限额，把 session 通知与协议事件落成可回放的 NDJSON trace，并在终态冻结与保存。
源码：[src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts)

## 符号（10）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:appendAcpRuntimeSemanticTraceEvent -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:armAcpRuntimeSemanticTraceRecorder -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:beginAcpRuntimeSemanticTraceClaimAttempt -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:claimAcpRuntimeSemanticTraceRoot -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:finalizeAcpRuntimeSemanticTracePartial -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:finishAcpRuntimeSemanticTraceRoot -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:recordAcpRuntimeSemanticTraceEvent -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:recordAcpRuntimeSemanticTraceRequestTerminal -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:resetAcpRuntimeSemanticTraceRecorder -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:saveFrozenAcpRuntimeSemanticTrace -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpRuntimeSemanticTraceEvent | 函数 | 308–345 | 复杂 | trace、录制、限额 | 0 | 追加一条 trace 事件：绑定 owner、检查限额与字节预算并写出 NDJSON 行。 |
| armAcpRuntimeSemanticTraceRecorder | 函数 | 208–272 | 复杂 | trace、录制、模式独占 | 0 | 预备录制器：校验 debug 可用性、取得 recording 模式独占并绑定 owner 限额。 |
| beginAcpRuntimeSemanticTraceClaimAttempt | 函数 | 347–362 | 简单 | trace、状态机、录制 | 0 | 开始一次 root claim 尝试，记录尝试态以便放弃时回滚。 |
| claimAcpRuntimeSemanticTraceRoot | 函数 | 371–419 | 中等 | trace、并发控制、录制 | 0 | 以 CAS 语义争抢 trace root 的独占所有权，失败者不得写入事件。 |
| finalizeAcpRuntimeSemanticTracePartial | 函数 | 582–610 | 中等 | trace、容错、收尾 | 0 | 把未完成的 trace 标记为 partial 并写入告警，使残缺录制仍然可被回放解析。 |
| finishAcpRuntimeSemanticTraceRoot | 函数 | 612–634 | 中等 | trace、收尾、资源释放 | 0 | 结束 root 录制：写 footer、结算未决 request 并释放诊断模式独占。 |
| recordAcpRuntimeSemanticTraceEvent | 函数 | 467–511 | 复杂 | trace、录制、事件 | 0 | 对外记录一条语义事件，校验 owner 绑定与 sourceKind 后追加到 trace。 |
| recordAcpRuntimeSemanticTraceRequestTerminal | 函数 | 513–544 | 中等 | trace、终态、录制 | 0 | 记录 request 的终态事件（成功、失败或取消），使回放能识别 turn 结束点。 |
| resetAcpRuntimeSemanticTraceRecorder | 函数 | 668–710 | 复杂 | trace、状态重置、测试支撑 | 0 | 重置录制器内部状态并释放模式独占，供测试与重试场景复用。 |
| saveFrozenAcpRuntimeSemanticTrace | 函数 | 646–666 | 中等 | trace、持久化、工件 | 0 | 把冻结的 trace 文档写入运行时目录，用于后续回放或人工分析。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpRuntimeDiagnosticsMode.ts](acpRuntimeDiagnosticsMode.ts.md) | src/modules/acp/diagnostics/acpRuntimeDiagnosticsMode.ts | 运行时诊断模式（idle / recording / replaying）的单例状态机，保证录制与回放互斥，避免同一时间存在两个诊断消费者。 |
| [acpRuntimeSemanticTrace.ts](acpRuntimeSemanticTrace.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunnerOrchestrator.ts](../skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunStore.ts](../skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [runSeam.ts](../../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [types.ts](../../../providers/types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| armAcpRuntimeSemanticTraceRecorder | 函数 | 208–272 | 预备录制器：校验 debug 可用性、取得 recording 模式独占并绑定 owner 限额。 |
| beginAcpRuntimeSemanticTraceClaimAttempt | 函数 | 347–362 | 开始一次 root claim 尝试，记录尝试态以便放弃时回滚。 |
| claimAcpRuntimeSemanticTraceRoot | 函数 | 371–419 | 以 CAS 语义争抢 trace root 的独占所有权，失败者不得写入事件。 |
| finishAcpRuntimeSemanticTraceRoot | 函数 | 612–634 | 结束 root 录制：写 footer、结算未决 request 并释放诊断模式独占。 |
| recordAcpRuntimeSemanticTraceEvent | 函数 | 467–511 | 对外记录一条语义事件，校验 owner 绑定与 sourceKind 后追加到 trace。 |
| recordAcpRuntimeSemanticTraceRequestTerminal | 函数 | 513–544 | 记录 request 的终态事件（成功、失败或取消），使回放能识别 turn 结束点。 |
| resetAcpRuntimeSemanticTraceRecorder | 函数 | 668–710 | 重置录制器内部状态并释放模式独占，供测试与重试场景复用。 |
| saveFrozenAcpRuntimeSemanticTrace | 函数 | 646–666 | 把冻结的 trace 文档写入运行时目录，用于后续回放或人工分析。 |
