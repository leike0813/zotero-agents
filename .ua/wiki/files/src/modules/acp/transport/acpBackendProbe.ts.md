
# src/modules/acp/transport/acpBackendProbe.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpBackendProbe.ts -->

ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。
源码：[src/modules/acp/transport/acpBackendProbe.ts](../../../../../../../src/modules/acp/transport/acpBackendProbe.ts)

## 符号（9）
<!-- node: function:src/modules/acp/transport/acpBackendProbe.ts:appendAcpProbeLog -->
<!-- node: function:src/modules/acp/transport/acpBackendProbe.ts:buildAcpRuntimeOptionsCache -->
<!-- node: function:src/modules/acp/transport/acpBackendProbe.ts:compactAdapterDiagnostic -->
<!-- node: function:src/modules/acp/transport/acpBackendProbe.ts:compactCloseEvent -->
<!-- node: function:src/modules/acp/transport/acpBackendProbe.ts:compactTransportSnapshot -->
<!-- node: function:src/modules/acp/transport/acpBackendProbe.ts:probeAcpBackendRuntimeOptions -->
<!-- node: function:src/modules/acp/transport/acpBackendProbe.ts:selectRuntimeOptionsCache -->
<!-- node: function:src/modules/acp/transport/acpBackendProbe.ts:summarizeAcpRuntimeOptionsCache -->
<!-- node: function:src/modules/acp/transport/acpBackendProbe.ts:withProbeTimeout -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpProbeLog | 函数 | 118–139 | 简单 | acp、能力探测、serialization | 0 | 向运行时日志追加一条探测日志，自动裁剪紧凑快照的体积。 |
| buildAcpRuntimeOptionsCache | 函数 | 60–80 | 简单 | acp、能力探测、factory | 0 | 构造带时间戳的运行时选项缓存条目，标注来源后端与探测时刻。 |
| compactAdapterDiagnostic | 函数 | 180–199 | 简单 | acp、能力探测、utility | 0 | 把适配器诊断事件压缩为短文本，屏蔽大 payload 与敏感路径。 |
| compactCloseEvent | 函数 | 201–215 | 简单 | acp、能力探测、utility | 0 | 压缩连接关闭事件，记录关闭原因与是否被主动取消。 |
| compactTransportSnapshot | 函数 | 148–178 | 简单 | acp、能力探测、projection | 0 | 裁剪 transport 快照，仅保留后端标识、命令与连接阶段等诊断必需字段。 |
| probeAcpBackendRuntimeOptions | 函数 | 237–423 | 中等 | acp、能力探测、utility | 0 | 执行完整探测流程：连接后端、初始化会话、读取模式与模型后写回缓存，并在任何失败路径释放资源。 |
| selectRuntimeOptionsCache | 函数 | 82–93 | 简单 | acp、能力探测、cache | 0 | 在多份缓存中选择最新且与当前后端匹配的一份，避免陈旧探测结果覆盖。 |
| summarizeAcpRuntimeOptionsCache | 函数 | 102–116 | 简单 | acp、能力探测、cache | 0 | 把运行时选项缓存压缩为可写入日志的摘要，隐去冗长的 MCP 服务器定义。 |
| withProbeTimeout | 函数 | 217–235 | 简单 | acp、能力探测、utility | 0 | 为探测步骤套上超时护栏，超时后主动关闭连接并返回可诊断的失败原因。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpSessionConfigOptions.ts](../chat/acpSessionConfigOptions.ts.md) | src/modules/acp/chat/acpSessionConfigOptions.ts | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [acpSkillRunAuditTrail.ts](../skillRun/acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [identity.ts](../../../backends/identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](../diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [workflowSettingsWebDialog.ts](../../workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpRuntimeOptionsCache | 函数 | 60–80 | 构造带时间戳的运行时选项缓存条目，标注来源后端与探测时刻。 |
| probeAcpBackendRuntimeOptions | 函数 | 237–423 | 执行完整探测流程：连接后端、初始化会话、读取模式与模型后写回缓存，并在任何失败路径释放资源。 |
