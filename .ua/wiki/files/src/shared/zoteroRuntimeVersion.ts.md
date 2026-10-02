
# src/shared/zoteroRuntimeVersion.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/zoteroRuntimeVersion.ts -->

把 Zotero 版本号解析为受支持的主版本（7 / 9 / 10），用于兼容性分支与诊断输出。
源码：[src/shared/zoteroRuntimeVersion.ts](../../../../../src/shared/zoteroRuntimeVersion.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceBaseline.ts](../modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts | ACP 运行时性能基线治理：脱敏采集元数据与环境信息、汇总 profiler 快照并构造可冻结的基线记录。 |
| [acpRuntimePerformanceProfiler.ts](../modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpRuntimeReplayProductionPorts.ts](../modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |
| [acpSkillRunExecutionSupport.ts](../modules/acp/skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [dashboardActions.ts](../modules/dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
