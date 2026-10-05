
# src/modules/workflow/ui/workflowMenu.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/ui](../../../../../modules/src/modules/workflow/ui.md)
<!-- node: file:src/modules/workflow/ui/workflowMenu.ts -->

工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。
源码：[src/modules/workflow/ui/workflowMenu.ts](../../../../../../../src/modules/workflow/ui/workflowMenu.ts)

## 符号（5）
<!-- node: function:src/modules/workflow/ui/workflowMenu.ts:appendInstallOfficialPackageItem -->
<!-- node: function:src/modules/workflow/ui/workflowMenu.ts:ensureWorkflowMenuForWindow -->
<!-- node: function:src/modules/workflow/ui/workflowMenu.ts:rebuildWorkflowActionPopup -->
<!-- node: function:src/modules/workflow/ui/workflowMenu.ts:refreshWorkflowMenus -->
<!-- node: function:src/modules/workflow/ui/workflowMenu.ts:triggerWorkflowFromUnifiedEntry -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendInstallOfficialPackageItem | 函数 | 147–183 | 简单 | menu、popup、workflow-package、install | 1 | 在弹出面板中追加“安装官方工作流包”入口及其状态提示。 |
| [ensureWorkflowMenuForWindow](../../../../../symbols/src/modules/workflow/ui/workflowMenu.ts/ensureWorkflowMenuForWindow.md) | 函数 | 377–408 | 简单 | menu、window、lifecycle、idempotent | 2 | 为指定窗口确保工作流菜单已安装且指向当前目录状态。 |
| rebuildWorkflowActionPopup | 函数 | 268–375 | 中等 | menu、popup、ui、composition | 1 | 重建工作流操作弹出面板：按显示顺序与可见性组装条目，附加后端/设置入口与官方包安装项。 |
| [refreshWorkflowMenus](../../../../../symbols/src/modules/workflow/ui/workflowMenu.ts/refreshWorkflowMenus.md) | 函数 | 410–415 | 简单 | menu、refresh、ui | 3 | 刷新所有已打开窗口的工作流菜单与弹出面板内容。 |
| triggerWorkflowFromUnifiedEntry | 函数 | 233–266 | 简单 | menu、trigger、entry-point、policy | 0 | 统一触发入口：按策略判定是否需要选择上下文，随后执行工作流并反馈触发失败原因。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [feedbackPolicy.ts](../../workflowExecution/feedbackPolicy.ts.md) | src/modules/workflowExecution/feedbackPolicy.ts | 工作流通知策略的单一判定点，按 manifest 的 execution.feedback.showNotifications 决定是否展示完成通知。 |
| [feedbackSeam.ts](../../workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [localization.ts](../../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [selectionContext.ts](../../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [triggerPolicy.ts](../../../workflows/triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowExecute.ts](workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowInputPlanning.ts](../../../workflows/workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowRuntime.ts](../catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSettings.ts](../settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowVisibility.ts](../catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |
| [zoteroHostCapabilityBroker.ts](../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](../settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardToolbarButton.ts](../../dashboardToolbarButton.ts.md) | src/modules/dashboardToolbarButton.ts | Zotero 主窗口工具栏按钮的注入与维护模块，负责为 Dashboard、通用工作流和 SkillRunner 各自创建 XUL browser 按钮，并同步图标与待处理计数徽标。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [workflowSettingsDialog.ts](../settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [ensureWorkflowMenuForWindow](../../../../../symbols/src/modules/workflow/ui/workflowMenu.ts/ensureWorkflowMenuForWindow.md) | 函数 | 377–408 | 为指定窗口确保工作流菜单已安装且指向当前目录状态。 |
| rebuildWorkflowActionPopup | 函数 | 268–375 | 重建工作流操作弹出面板：按显示顺序与可见性组装条目，附加后端/设置入口与官方包安装项。 |
| [refreshWorkflowMenus](../../../../../symbols/src/modules/workflow/ui/workflowMenu.ts/refreshWorkflowMenus.md) | 函数 | 410–415 | 刷新所有已打开窗口的工作流菜单与弹出面板内容。 |
| triggerWorkflowFromUnifiedEntry | 函数 | 233–266 | 统一触发入口：按策略判定是否需要选择上下文，随后执行工作流并反馈触发失败原因。 |
