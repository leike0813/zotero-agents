
# src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/runtime](../../../../../modules/src/modules/skillRunner/runtime.md)
<!-- node: file:src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts -->

SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。
源码：[src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts](../../../../../../../src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts)

## 符号（2）
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts:runShutdownStep -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts:shutdownSkillRunnerAsyncLifecycle -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| runShutdownStep | 函数 | 15–33 | 简单 | lifecycle、error-handling、logging | 1 | 执行单个停机步骤并捕获异常，把失败以 warn 级别写入运行时日志后继续。 |
| shutdownSkillRunnerAsyncLifecycle | 函数 | 35–58 | 中等 | lifecycle、shutdown、entry-point、orchestration | 0 | SkillRunner 停机的总入口，顺序执行全部清理步骤并确保模型缓存自动刷新也被停止。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [modelCache.ts](../../../providers/skillrunner/modelCache.ts.md) | src/providers/skillrunner/modelCache.ts | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [skillRunnerAutoReplyObserver.ts](../run/skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerLocalRuntimeManager.ts](skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerSessionSyncManager.ts](../run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [skillRunnerTaskReconciler.ts](../run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| shutdownSkillRunnerAsyncLifecycle | 函数 | 35–58 | SkillRunner 停机的总入口，顺序执行全部清理步骤并确保模型缓存自动刷新也被停止。 |
