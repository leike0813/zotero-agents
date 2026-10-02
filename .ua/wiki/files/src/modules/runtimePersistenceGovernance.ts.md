
# src/modules/runtimePersistenceGovernance.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/runtimePersistenceGovernance.ts -->

运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。
源码：[src/modules/runtimePersistenceGovernance.ts](../../../../../src/modules/runtimePersistenceGovernance.ts)

## 符号（5）
<!-- node: function:src/modules/runtimePersistenceGovernance.ts:cleanupRuntimePersistenceIssues -->
<!-- node: function:src/modules/runtimePersistenceGovernance.ts:cleanupRuntimePersistenceRetention -->
<!-- node: function:src/modules/runtimePersistenceGovernance.ts:scanPersistenceIntegrity -->
<!-- node: function:src/modules/runtimePersistenceGovernance.ts:scanRuntimePersistenceGovernance -->
<!-- node: function:src/modules/runtimePersistenceGovernance.ts:scanRuntimePersistenceUsage -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| cleanupRuntimePersistenceIssues | 函数 | 821–832 | 简单 | persistence、governance、cleanup、repair | 1 | 批量执行扫描得到的 issue 修复动作，把损坏资产收敛回健康状态。 |
| cleanupRuntimePersistenceRetention | 函数 | 841–891 | 复杂 | persistence、governance、retention、cleanup | 0 | 按保留期限清理过期资产，删除前复用受管路径校验，失败项转为可重试的 issue。 |
| [scanPersistenceIntegrity](../../../symbols/src/modules/runtimePersistenceGovernance.ts/scanPersistenceIntegrity.md) | 函数 | 355–527 | 复杂 | persistence、governance、integrity、diagnostics | 1 | 巡检受管持久化区的完整性：识别孤儿文件、失效目录、摘要不匹配与路径策略违规。 |
| scanRuntimePersistenceGovernance | 函数 | 711–755 | 中等 | persistence、governance、entry-point、diagnostics | 0 | 治理扫描的统一入口：合并完整性、占用与策略检查，输出可展示的治理报告。 |
| [scanRuntimePersistenceUsage](../../../symbols/src/modules/runtimePersistenceGovernance.ts/scanRuntimePersistenceUsage.md) | 函数 | 572–704 | 复杂 | persistence、governance、metrics、retention | 1 | 统计各类持久化资产的占用与最旧时间戳，为配额与保留策略提供决策依据。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [pluginStateStore.ts](pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [runtimeLogManager.ts](runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [taskRetentionPolicy.ts](taskRetentionPolicy.ts.md) | src/modules/taskRetentionPolicy.ts | 任务记录保留策略的单一事实源，导出统一的保留时长常量，供 Host Bridge operation store、Dashboard history 等持久化层共同引用。 |
| [workflowProductStore.ts](workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [cleanup-runtime-category-cli.ts](../../scripts/internal/cleanup-runtime-category-cli.ts.md) | scripts/internal/cleanup-runtime-category-cli.ts | 运行时持久化目录分类清理 CLI：扫描 runtime 数据树并按类别删除/保留条目，供 clear-* 脚本与运维流程调用。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeCapabilityRegistry.ts](hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| cleanupRuntimePersistenceIssues | 函数 | 821–832 | 批量执行扫描得到的 issue 修复动作，把损坏资产收敛回健康状态。 |
| cleanupRuntimePersistenceRetention | 函数 | 841–891 | 按保留期限清理过期资产，删除前复用受管路径校验，失败项转为可重试的 issue。 |
| scanRuntimePersistenceGovernance | 函数 | 711–755 | 治理扫描的统一入口：合并完整性、占用与策略检查，输出可展示的治理报告。 |
