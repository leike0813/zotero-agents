
# src/utils/locale.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/locale.ts -->

Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。
源码：[src/utils/locale.ts](../../../../../src/utils/locale.ts)

## 符号（4）
<!-- node: function:src/utils/locale.ts:getLocaleID -->
<!-- node: function:src/utils/locale.ts:getString -->
<!-- node: function:src/utils/locale.ts:getStringOrFallback -->
<!-- node: function:src/utils/locale.ts:initLocale -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getLocaleID | 函数 | 134–136 | 简单 | i18n、locale、query、exported | 0 | 返回当前生效的 locale id，供语言相关分支判断。 |
| getString | 函数 | 58–70 | 简单 | i18n、lookup、fluent、exported | 1 | 按 message id 取本地化文案，缺失时抛错以暴露漏翻译。 |
| getStringOrFallback | 函数 | 72–94 | 简单 | i18n、fallback、fluent、exported | 0 | 按 id 取文案并在缺失时回退到调用方提供的默认文本。 |
| initLocale | 函数 | 10–27 | 简单 | i18n、initialization、fluent、exported | 1 | 用插件 FTL 资源初始化 Localization 实例并挂到 addon.data.locale。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [ztoolkit.ts](ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](../modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpSidebarModel.ts](../modules/acp/chat/acpSidebarModel.ts.md) | src/modules/acp/chat/acpSidebarModel.ts | 构建 ACP Chat 侧边栏视图快照：解析会话状态标签与宿主上下文摘要，产出侧边栏消费的展示模型。 |
| [acpSkillRunTranscriptMirror.ts](../modules/acp/skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |
| [assistantPanelLabels.ts](../modules/assistant/workspace/assistantPanelLabels.ts.md) | src/modules/assistant/workspace/assistantPanelLabels.ts | Assistant 面板标签文案表：集中声明各面板标题、按钮、空态与错误提示的本地化文本。 |
| [assistantWorkspacePublicationLabels.ts](../modules/assistant/publication/assistantWorkspacePublicationLabels.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts | 集中构建 Assistant Workspace 全部展示标签的文案表，避免各区域散落 i18n 键拼接。 |
| [assistantWorkspaceSidebar.ts](../modules/assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [backendManager.ts](../modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [dashboardHost.ts](../modules/dashboardHost.ts.md) | src/modules/dashboardHost.ts | 任务 Dashboard 的宿主装配层：既支持在独立 Zotero 窗口中以 DialogHelper 打开，也支持挂载到外部传入的 embeddedRoot 容器，并把外部的选择动作转接给 Dashboard 运行时。 |
| [dashboardSnapshot.ts](../modules/dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [dashboardToolbarButton.ts](../modules/dashboardToolbarButton.ts.md) | src/modules/dashboardToolbarButton.ts | Zotero 主窗口工具栏按钮的注入与维护模块，负责为 Dashboard、通用工作流和 SkillRunner 各自创建 XUL browser 按钮，并同步图标与待处理计数徽标。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [libraryArtifactsColumn.ts](../modules/libraryArtifactsColumn.ts.md) | src/modules/libraryArtifactsColumn.ts | 为 Zotero 文献库列表注册「文献产物」与「文献评分」两个虚拟列，负责单元格数据供给、渲染、缓存与防抖刷新。 |
| [localizationGovernance.ts](localizationGovernance.ts.md) | src/utils/localizationGovernance.ts | 本地化治理层：canonicalize locale、按语言回退链取值、识别未解析的原始文案，并集中产出托管本地运行时与 SkillRunner 后端相关的 toast 文案。 |
| [markdownAttachmentTab.ts](../modules/markdownAttachmentTab.ts.md) | src/modules/markdownAttachmentTab.ts | Markdown 附件阅读器标签页的完整实现：在 Zotero 标签中创建内嵌 browser 加载共享阅读器页面，把文档内容通过 bridge 注入，并在页面脚本加载失败时回退到内联独立 HTML。 |
| [messageFormatter.ts](../modules/workflowExecution/messageFormatter.ts.md) | src/modules/workflowExecution/messageFormatter.ts | 工作流消息本地化格式化器：先查 addon locale 资源，缺失时回落到调用方提供的 fallback 文案，并组装出符合 WorkflowMessageFormatter 契约的格式化函数。 |
| [preferenceScript.ts](../modules/preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [selectionSample.ts](../modules/workflow/ui/selectionSample.ts.md) | src/modules/workflow/ui/selectionSample.ts | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [skillRunnerLocalDeployDebugDialog.ts](../modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts | 本地运行时部署调试对话框：把调试日志条目渲染为可读列表，支持复制单条详情或整段控制台文本，便于排查一键部署失败。 |
| [skillRunnerLocalRuntimePreferences.ts](../modules/preferences/skillRunnerLocalRuntimePreferences.ts.md) | src/modules/preferences/skillRunnerLocalRuntimePreferences.ts | SkillRunner 本地运行时相关的偏好面板绑定，负责安装目录、版本、自动拉取与自动拉起等设置的读写与即时生效。 |
| [skillRunnerManagementDialog.ts](../modules/skillRunner/surface/skillRunnerManagementDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerManagementDialog.ts | SkillRunner 管理界面的 URL 构造工具：校验并规范化后端 baseUrl，补齐 /ui 路径，为管理面板提供安全的打开地址。 |
| [skillRunnerRunDialog.ts](../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [synthesisWorkbenchTab.ts](../modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [workflowExecute.ts](../modules/workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowMenu.ts](../modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowSettings.ts](../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialog.ts](../modules/workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |
| [workflowSettingsOptionLocalization.ts](../modules/workflow/settings/workflowSettingsOptionLocalization.ts.md) | src/modules/workflow/settings/workflowSettingsOptionLocalization.ts | Provider 运行时选项与工作流运行选项的文案本地化，优先按 locale key 查表，缺失时回落到 schema 自带文本。 |
| [workflowSettingsWebDialog.ts](../modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |
| [workspaceTab.ts](../modules/workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |
| [workspaceToolbarTaskPopover.ts](../modules/workspaceToolbarTaskPopover.ts.md) | src/modules/workspaceToolbarTaskPopover.ts | Zotero 主窗口工具栏的任务气泡：用 XUL 元素实现悬停/点击展开的任务列表弹层，按状态渲染 LED 色调、显示可见任务行并支持直接打开对应工作台。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getLocaleID | 函数 | 134–136 | 返回当前生效的 locale id，供语言相关分支判断。 |
| getString | 函数 | 58–70 | 按 message id 取本地化文案，缺失时抛错以暴露漏翻译。 |
| getStringOrFallback | 函数 | 72–94 | 按 id 取文案并在缺失时回退到调用方提供的默认文本。 |
| initLocale | 函数 | 10–27 | 用插件 FTL 资源初始化 Localization 实例并挂到 addon.data.locale。 |
