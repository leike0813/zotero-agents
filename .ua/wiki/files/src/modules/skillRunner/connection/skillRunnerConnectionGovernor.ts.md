
# src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/connection](../../../../../modules/src/modules/skillRunner/connection.md)
<!-- node: file:src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts -->

SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。
源码：[src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts](../../../../../../../src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts)

## 符号（7）
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts:abortSkillRunnerConnections -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts:createTimeoutError -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts:hasSkillRunnerConnectionActivityForBackend -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts:hasSkillRunnerPhysicalConnectionDebt -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts:isSkillRunnerConnectionSkippedError -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts:runSkillRunnerConnection -->
<!-- node: class:src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts:SkillRunnerConnectionGovernor -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| abortSkillRunnerConnections | 函数 | 1082–1089 | 简单 | lifecycle、abort、skillrunner | 0 | 中止指定后端或全部在途与排队的 SkillRunner 连接，用于后端下线与插件关闭。 |
| createTimeoutError | 函数 | 144–155 | 简单 | error-handling、timeout、utility | 0 | 构造带超时语义与泳道上下文的错误对象，供上层识别为超时而非业务失败。 |
| hasSkillRunnerConnectionActivityForBackend | 函数 | 1095–1099 | 简单 | query、state、skillrunner | 0 | 判断某后端当前是否仍有活跃或排队的连接，避免在仍有活动时误判为可清理。 |
| hasSkillRunnerPhysicalConnectionDebt | 函数 | 1101–1103 | 简单 | query、lifecycle、state | 0 | 判断是否仍存在尚未归还的物理连接债务，退出时据此决定是否需要等待释放。 |
| isSkillRunnerConnectionSkippedError | 函数 | 1105–1112 | 简单 | classification、error-handling、skillrunner | 0 | 识别由治理器主动跳过（不可达、后台低优先级、历史任务）产生的错误，使调用方不将其视为真实故障。 |
| runSkillRunnerConnection | 函数 | 1076–1080 | 简单 | facade、entry-point、skillrunner | 1 | 通过默认 governor 提交一次 SkillRunner 连接任务的模块级门面。 |
| SkillRunnerConnectionGovernor | 类 | 167–1039 | 复杂 | governor、concurrency、queue、scheduler | 0 | 连接调度器核心类：维护排队队列、前台流池与物理连接债务，按泳道优先级与并发上限决定何时真正发起连接，并记录开始/结束/迟到结算事件。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [skillRunnerConnectionAuditStore.ts](skillRunnerConnectionAuditStore.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts | SkillRunner 连接审计事件的内存存储：按 governor 实例保留有界事件流与分类计数，供调试开关打开时查询连接排队、超时、跳过与迟到结算等行为。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](../../../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [managementClient.ts](../../../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [skillRunnerConnectionAudit.ts](skillRunnerConnectionAudit.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts | 连接审计的读取门面：把 connection governor 的核心快照与连接审计事件存储合并为单一诊断快照。 |
| [skillRunnerConnectionAuditStore.ts](skillRunnerConnectionAuditStore.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts | SkillRunner 连接审计事件的内存存储：按 governor 实例保留有界事件流与分类计数，供调试开关打开时查询连接排队、超时、跳过与迟到结算等行为。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| abortSkillRunnerConnections | 函数 | 1082–1089 | 中止指定后端或全部在途与排队的 SkillRunner 连接，用于后端下线与插件关闭。 |
| hasSkillRunnerConnectionActivityForBackend | 函数 | 1095–1099 | 判断某后端当前是否仍有活跃或排队的连接，避免在仍有活动时误判为可清理。 |
| hasSkillRunnerPhysicalConnectionDebt | 函数 | 1101–1103 | 判断是否仍存在尚未归还的物理连接债务，退出时据此决定是否需要等待释放。 |
| isSkillRunnerConnectionSkippedError | 函数 | 1105–1112 | 识别由治理器主动跳过（不可达、后台低优先级、历史任务）产生的错误，使调用方不将其视为真实故障。 |
| runSkillRunnerConnection | 函数 | 1076–1080 | 通过默认 governor 提交一次 SkillRunner 连接任务的模块级门面。 |
| SkillRunnerConnectionGovernor | 类 | 167–1039 | 连接调度器核心类：维护排队队列、前台流池与物理连接债务，按泳道优先级与并发上限决定何时真正发起连接，并记录开始/结束/迟到结算事件。 |
