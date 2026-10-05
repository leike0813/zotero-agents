
# src/modules/workflowExecution/feedbackSeam.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/feedbackSeam.ts -->

工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。
源码：[src/modules/workflowExecution/feedbackSeam.ts](../../../../../../src/modules/workflowExecution/feedbackSeam.ts)

## 符号（13）
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:alertWindow -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:createWorkflowNotificationOwner -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:emitWorkflowFinishSummary -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:emitWorkflowJobToasts -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:emitWorkflowStartToast -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:emitWorkflowWaitingToast -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:enforceVisibleWorkflowToastLimit -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:resolveWorkflowToastEmoji -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:selectWorkflowJobOutcomesForToasts -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:shouldEmitWorkflowFinishSummaryToast -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:shouldSuppressDuplicateWorkflowToast -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:showWorkflowProgressToast -->
<!-- node: function:src/modules/workflowExecution/feedbackSeam.ts:showWorkflowToast -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| alertWindow | 函数 | 430–442 | 简单 | window、resolution、defensive、exported | 1 | 取得用于承载进度窗口的宿主窗口对象，并在窗口失效时安全返回空。 |
| createWorkflowNotificationOwner | 函数 | 115–180 | 中等 | notification、identity、seam、exported | 0 | 创建工作流通知所有者，绑定图标与去重身份，使 toast 与通知中心事件可被统一追踪和撤销。 |
| emitWorkflowFinishSummary | 函数 | 584–621 | 简单 | feedback、summary、workflow-execution、exported | 0 | 发出工作流终态汇总 toast，聚合成功/失败/跳过计数并关闭进度 toast。 |
| emitWorkflowJobToasts | 函数 | 519–565 | 中等 | feedback、aggregation、workflow-execution、exported | 0 | 按任务粒度汇总执行结果，为成功/失败任务分别发出 toast。 |
| emitWorkflowStartToast | 函数 | 457–486 | 简单 | feedback、start、workflow-execution、exported | 0 | 工作流开始事件的用户反馈：构造开始文案并发出 toast 与通知。 |
| emitWorkflowWaitingToast | 函数 | 488–517 | 简单 | feedback、waiting、workflow-execution、exported | 0 | 工作流等待用户交互时的反馈，提示当前阻塞原因与可采取的动作。 |
| enforceVisibleWorkflowToastLimit | 函数 | 85–92 | 简单 | limits、toast、resource-management | 0 | 超出可见 toast 上限时关闭最旧条目，保证 Zotero 窗口不被 toast 淹没。 |
| resolveWorkflowToastEmoji | 函数 | 231–254 | 简单 | presentation、toast、emoji | 0 | 按事件类型解析 toast 前缀 emoji，使不同阶段在视觉上可区分。 |
| selectWorkflowJobOutcomesForToasts | 函数 | 567–573 | 简单 | filtering、presentation、feedback、exported | 0 | 从任务结果中挑选适合用 toast 呈现的条目，抑制噪声级别的成功提示。 |
| shouldEmitWorkflowFinishSummaryToast | 函数 | 575–582 | 简单 | filtering、presentation、feedback、exported | 0 | 判定是否需要发出终态汇总 toast，纯成功且任务数少时抑制。 |
| shouldSuppressDuplicateWorkflowToast | 函数 | 190–206 | 简单 | deduplication、toast、seam | 0 | 判定同所有者短时间内的重复 toast 是否应被抑制，避免执行链刷屏。 |
| showWorkflowProgressToast | 函数 | 376–428 | 中等 | toast、progress、feedback、exported | 1 | 显示带进度条的常驻工作流 toast，并在完成或失败时自行关闭。 |
| showWorkflowToast | 函数 | 307–374 | 中等 | toast、feedback、limits、exported | 0 | 显示单条工作流 toast：套用图标、severity 与可见数量上限并登记到通知中心。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [notificationHub.ts](../notificationHub.ts.md) | src/modules/notificationHub.ts | 插件内通知中心：接收各模块投递的通知事件，按展示分组与去重键抑制重复提示，并提供有界事件列表与按客户端确认。 |
| [package.json](../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [runtimeBridge.ts](../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeLogManager.ts](../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowExecuteMessage.ts](workflowExecuteMessage.ts.md) | src/modules/workflowExecution/workflowExecuteMessage.ts | 工作流执行消息与 toast 文案的构建层：把执行结果、错误与队列进度组装成可本地化的展示文案。 |
| [workflowHostErrorContract.ts](../../workflows/workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceSidebar.ts](../assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [hooks.ts](../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostApi.ts](../../workflows/hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [preparationSeam.ts](preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [skillRunnerBackendToasts.ts](../skillRunner/surface/skillRunnerBackendToasts.ts.md) | src/modules/skillRunner/surface/skillRunnerBackendToasts.ts | 后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。 |
| [skillRunnerLocalRuntimeManager.ts](../skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [skillRunnerRunDialog.ts](../skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerTaskReconciler.ts](../skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [synthesisWorkbenchTab.ts](../synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [testRuntimeCleanup.ts](../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowExecute.ts](../workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowHostOwners.ts](../../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowMenu.ts](../workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowRuntimeBridge.ts](../workflow/catalog/workflowRuntimeBridge.ts.md) | src/modules/workflow/catalog/workflowRuntimeBridge.ts | 工作流运行时桥：向工作流包暴露一个极小的宿主能力面（appendRuntimeLog 与 showToast），同时写入 globalThis 与 addon 对象，供工作流包在无 import 权限下调用宿主。 |
| [workflowSettingsWebDialog.ts](../workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [postAttention](../workspaceTab.ts.md) | src/modules/workspaceTab.ts | 统计需要人工关注的任务数并更新工作台入口上的角标提示。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| alertWindow | 函数 | 430–442 | 取得用于承载进度窗口的宿主窗口对象，并在窗口失效时安全返回空。 |
| createWorkflowNotificationOwner | 函数 | 115–180 | 创建工作流通知所有者，绑定图标与去重身份，使 toast 与通知中心事件可被统一追踪和撤销。 |
| emitWorkflowFinishSummary | 函数 | 584–621 | 发出工作流终态汇总 toast，聚合成功/失败/跳过计数并关闭进度 toast。 |
| emitWorkflowJobToasts | 函数 | 519–565 | 按任务粒度汇总执行结果，为成功/失败任务分别发出 toast。 |
| emitWorkflowStartToast | 函数 | 457–486 | 工作流开始事件的用户反馈：构造开始文案并发出 toast 与通知。 |
| emitWorkflowWaitingToast | 函数 | 488–517 | 工作流等待用户交互时的反馈，提示当前阻塞原因与可采取的动作。 |
| selectWorkflowJobOutcomesForToasts | 函数 | 567–573 | 从任务结果中挑选适合用 toast 呈现的条目，抑制噪声级别的成功提示。 |
| shouldEmitWorkflowFinishSummaryToast | 函数 | 575–582 | 判定是否需要发出终态汇总 toast，纯成功且任务数少时抑制。 |
| showWorkflowProgressToast | 函数 | 376–428 | 显示带进度条的常驻工作流 toast，并在完成或失败时自行关闭。 |
| showWorkflowToast | 函数 | 307–374 | 显示单条工作流 toast：套用图标、severity 与可见数量上限并登记到通知中心。 |
