
# src/modules/acp/skillRun/acpSkillRunAuditTrail.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts -->

skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。
源码：[src/modules/acp/skillRun/acpSkillRunAuditTrail.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunAuditTrail.ts)

## 符号（9）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:appendAcpSkillRunAuditEvent -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:appendAcpSkillRunAuditUpdate -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:appendAcpSkillRunTransportAuditEvent -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:buildRunSnapshot -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:initializeAcpSkillRunAuditTrail -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:renderReadme -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:summarizeAcpUpdate -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:writeAcpSkillRunAuditFinalState -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:writeAcpSkillRunAuditRuntimeLogs -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpSkillRunAuditEvent | 函数 | 393–427 | 中等 | 审计、时间线、容错 | 0 | 追加一条时间线事件到审计文件，失败时记录审计自身故障而不影响主流程。 |
| appendAcpSkillRunAuditUpdate | 函数 | 567–595 | 中等 | 审计、摘要、acp-skills | 0 | 追加一条 update 摘要事件，携带 agent 活动与 workspace 活动计数。 |
| appendAcpSkillRunTransportAuditEvent | 函数 | 466–495 | 中等 | 审计、transport、诊断 | 0 | 记录 transport 层事件（连接、请求、取消），用于区分协议问题与 Agent 行为问题。 |
| buildRunSnapshot | 函数 | 308–352 | 中等 | 审计、快照、acp-skills | 0 | 汇总 run 记录、backend 与请求参数，构造审计 run 快照作为后续事件的公共头。 |
| initializeAcpSkillRunAuditTrail | 函数 | 354–391 | 中等 | 审计、初始化、acp-skills | 0 | 初始化 run 的审计目录与写入器：按 debug 模式决定工件粒度并生成 README。 |
| renderReadme | 函数 | 284–306 | 中等 | 审计、文档、渲染 | 1 | 渲染审计目录的 README，说明各工件文件的用途与读取顺序。 |
| summarizeAcpUpdate | 函数 | 505–565 | 复杂 | 审计、摘要、有界写入 | 0 | 把高频 session update 归纳为有界摘要，避免逐条原文写入审计造成工件膨胀。 |
| writeAcpSkillRunAuditFinalState | 函数 | 669–723 | 中等 | 审计、终态、acp-skills | 0 | 写入 run 终态审计：最终状态、产物 revision 与执行耗时等结论性信息。 |
| writeAcpSkillRunAuditRuntimeLogs | 函数 | 643–667 | 中等 | 审计、runtime-log、导出 | 0 | 把运行期 runtime log 以 NDJSON 形式导出到审计目录，供事后回放分析。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAuditAppendCore.ts](../diagnostics/acpAuditAppendCore.ts.md) | src/modules/acp/diagnostics/acpAuditAppendCore.ts | 审计日志追加的公共内核：基于 bufferedWriteCoordinator 提供带 owner 维度的 NDJSON 追加、刷盘、丢弃，并统一处理溢出与写入失败事件。 |
| [acpDiagnostics.ts](../diagnostics/acpDiagnostics.ts.md) | src/modules/acp/diagnostics/acpDiagnostics.ts | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpSkillRunnerWorkspace.ts](acpSkillRunnerWorkspace.ts.md) | src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts | Skill runner 工作区管理：创建/清理 runtime 下的运行工作目录，隔离不同 requestId 的产物。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendProbe.ts](../transport/acpBackendProbe.ts.md) | src/modules/acp/transport/acpBackendProbe.ts | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [acpBackendRefreshCacheDiagnostic.ts](../diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendAcpSkillRunAuditEvent | 函数 | 393–427 | 追加一条时间线事件到审计文件，失败时记录审计自身故障而不影响主流程。 |
| appendAcpSkillRunAuditUpdate | 函数 | 567–595 | 追加一条 update 摘要事件，携带 agent 活动与 workspace 活动计数。 |
| appendAcpSkillRunTransportAuditEvent | 函数 | 466–495 | 记录 transport 层事件（连接、请求、取消），用于区分协议问题与 Agent 行为问题。 |
| initializeAcpSkillRunAuditTrail | 函数 | 354–391 | 初始化 run 的审计目录与写入器：按 debug 模式决定工件粒度并生成 README。 |
| writeAcpSkillRunAuditFinalState | 函数 | 669–723 | 写入 run 终态审计：最终状态、产物 revision 与执行耗时等结论性信息。 |
| writeAcpSkillRunAuditRuntimeLogs | 函数 | 643–667 | 把运行期 runtime log 以 NDJSON 形式导出到审计目录，供事后回放分析。 |
