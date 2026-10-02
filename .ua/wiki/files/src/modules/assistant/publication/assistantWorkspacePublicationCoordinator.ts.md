
# src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/modules/assistant/publication](../../../../../modules/src/modules/assistant/publication.md)
<!-- node: file:src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts -->

发布协调器：把 runtime 产出的发布请求按 owner 排队、去重与节流，并跟踪 ack 生命周期与 lane 占用。
源码：[src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts](../../../../../../../src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts)

## 符号（1）
<!-- node: class:src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts:AssistantWorkspacePublicationCoordinator -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AssistantWorkspacePublicationCoordinator | 类 | 52–566 | 复杂 | coordinator、publication、scheduling、assistant、state-machine | 0 | 发布协调器：按 owner 维护发布 lane，去重同类请求、限制频率并跟踪 ack 阶段，是发布流量的唯一调度点。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceProfiler.ts](../../acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [assistantWorkspacePublication.ts](assistantWorkspacePublication.ts.md) | src/modules/assistant/publication/assistantWorkspacePublication.ts | Assistant Workspace 发布合约的 SSOT：定义 envelope/payload/transcript 字段集合、各 region 与 publication kind 注册表、owner 构造器，并提供发布体与 ack 的运行时断言。 |
| [assistantWorkspaceTranscriptPublication.ts](assistantWorkspaceTranscriptPublication.ts.md) | src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts | transcript 发布层：解析分页请求、规范化 transcript item、生成 mutation 与 page 结构，并提供有界的 projection/accumulator。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantReadonlyPublication.ts](../../harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [assistantWorkspacePublicationRuntime.ts](assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts | 发布运行时：持有各 domain adapter，负责初始化发布、transcript 分页读取与按 profile 计时，并把发布动作转交协调器执行。 |
| [assistantWorkspaceSidebar.ts](../workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AssistantWorkspacePublicationCoordinator | 类 | 52–566 | 发布协调器：按 owner 维护发布 lane，去重同类请求、限制频率并跟踪 ack 阶段，是发布流量的唯一调度点。 |
