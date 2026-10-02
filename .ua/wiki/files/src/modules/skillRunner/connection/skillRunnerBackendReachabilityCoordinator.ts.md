
# src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/connection](../../../../../modules/src/modules/skillRunner/connection.md)
<!-- node: file:src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts -->

后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。
源码：[src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts](../../../../../../../src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts)

## 符号（6）
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts:autoDisableBackend -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts:probeBackend -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts:runProbeSweep -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts:scheduleSkillRunnerBackendReachabilityProbe -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts:startSkillRunnerBackendReachabilityCoordinator -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts:stopSkillRunnerBackendReachabilityCoordinator -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| autoDisableBackend | 函数 | 67–114 | 中等 | health-check、policy、ui、skillrunner | 1 | 把长期不可达的后端从配置中禁用并向用户展示说明 toast，同时记录后端标识便于后续恢复。 |
| probeBackend | 函数 | 127–198 | 中等 | health-check、skillrunner、backend | 1 | 对单个后端执行一次可达性探针，根据结果更新健康注册表，并在达到自动禁用条件时触发禁用流程。 |
| runProbeSweep | 函数 | 200–213 | 简单 | health-check、scheduling、skillrunner | 1 | 执行一轮探针扫描，遍历当前已配置后端并对到期的条目并发发起探针。 |
| scheduleSkillRunnerBackendReachabilityProbe | 函数 | 215–249 | 中等 | scheduling、debounce、health-check | 1 | 以防抖方式调度下一轮可达性探针，避免配置变更引发密集扫描。 |
| startSkillRunnerBackendReachabilityCoordinator | 函数 | 251–291 | 中等 | lifecycle、scheduler、skillrunner | 0 | 启动可达性协调器：订阅后端注册表变更、立刻跑一轮扫描并开启周期性定时器。 |
| stopSkillRunnerBackendReachabilityCoordinator | 函数 | 293–305 | 简单 | lifecycle、cleanup、scheduler | 0 | 停止协调器，清除定时器并解除后端注册表订阅。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backgroundRefreshGovernance.ts](../../backgroundRefreshGovernance.ts.md) | src/modules/backgroundRefreshGovernance.ts | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [managementClient.ts](../../../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [skillRunnerBackendHealthRegistry.ts](skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerBackendToasts.ts](../surface/skillRunnerBackendToasts.ts.md) | src/modules/skillRunner/surface/skillRunnerBackendToasts.ts | 后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| scheduleSkillRunnerBackendReachabilityProbe | 函数 | 215–249 | 以防抖方式调度下一轮可达性探针，避免配置变更引发密集扫描。 |
| startSkillRunnerBackendReachabilityCoordinator | 函数 | 251–291 | 启动可达性协调器：订阅后端注册表变更、立刻跑一轮扫描并开启周期性定时器。 |
| stopSkillRunnerBackendReachabilityCoordinator | 函数 | 293–305 | 停止协调器，清除定时器并解除后端注册表订阅。 |
