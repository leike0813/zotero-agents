
# src/modules/backgroundRefreshGovernance.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/backgroundRefreshGovernance.ts -->

后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。
源码：[src/modules/backgroundRefreshGovernance.ts](../../../../../src/modules/backgroundRefreshGovernance.ts)

## 符号（3）
<!-- node: function:src/modules/backgroundRefreshGovernance.ts:getBackgroundRefreshGovernanceSnapshotForTests -->
<!-- node: function:src/modules/backgroundRefreshGovernance.ts:normalizePolicy -->
<!-- node: function:src/modules/backgroundRefreshGovernance.ts:recordBackgroundRefreshRead -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getBackgroundRefreshGovernanceSnapshotForTests | 函数 | 89–96 | 简单 | diagnostics、testing、snapshot、governance | 0 | 导出后台刷新治理快照（活跃定时器数、拒绝计数）供测试断言。 |
| normalizePolicy | 函数 | 49–79 | 简单 | normalization、governance、policy、configuration | 0 | 规范化后台刷新治理策略，裁剪非法上限并应用默认值。 |
| recordBackgroundRefreshRead | 函数 | 98–116 | 简单 | diagnostics、metrics、governance、read-amplification | 0 | 记录一次后台读取的来源与耗时，供诊断识别读放大。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunnerOrchestrator.ts](acp/skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [dashboardRuntime.ts](dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [hostBridgeServer.ts](hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [skillRunnerBackendReachabilityCoordinator.ts](skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [skillRunnerLocalRuntimeManager.ts](skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [synthesisWorkbenchTab.ts](synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [workspaceTab.ts](workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |
| [workspaceToolbarTaskPopover.ts](workspaceToolbarTaskPopover.ts.md) | src/modules/workspaceToolbarTaskPopover.ts | Zotero 主窗口工具栏的任务气泡：用 XUL 元素实现悬停/点击展开的任务列表弹层，按状态渲染 LED 色调、显示可见任务行并支持直接打开对应工作台。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getBackgroundRefreshGovernanceSnapshotForTests | 函数 | 89–96 | 导出后台刷新治理快照（活跃定时器数、拒绝计数）供测试断言。 |
| recordBackgroundRefreshRead | 函数 | 98–116 | 记录一次后台读取的来源与耗时，供诊断识别读放大。 |
