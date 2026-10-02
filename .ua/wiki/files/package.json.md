
# package.json
所属分层：[构建、发布与工程配置](../layers/build-tooling.md)  
所属目录：[.](../modules/index.md)
<!-- node: config:package.json -->

项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。
源码：[package.json](../../../package.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpRuntimePromptTemplates.ts](src/modules/acp/skillRun/acpRuntimePromptTemplates.ts.md) | src/modules/acp/skillRun/acpRuntimePromptTemplates.ts | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |
| [acpSkillPatchTemplates.ts](src/modules/acp/skillRun/acpSkillPatchTemplates.ts.md) | src/modules/acp/skillRun/acpSkillPatchTemplates.ts | Skill Patch 模板模块：把内置 patch 模板物化到 runtime 目录，供不同 agent family 修补 SKILL.md 行为差异。 |
| [addon.ts](src/addon.ts.md) | src/addon.ts | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |
| [assistantWorkspaceSidebar.ts](src/modules/assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [backendManager.ts](src/modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [build-content-package-feed.ts](scripts/content-package/build-content-package-feed.ts.md) | scripts/content-package/build-content-package-feed.ts | 内容包 feed 构建脚本：从 git 跟踪文件中收集内置工作流与 Skill 源码，打包 zip，并为 stable/beta/dev 各频道生成带 sha256 的 feed JSON。 |
| [contentPackageSubscription.ts](src/modules/workflow/catalog/contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [dashboardActions.ts](src/modules/dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardFrame.ts](src/modules/dashboard/dashboardFrame.ts.md) | src/modules/dashboard/dashboardFrame.ts | Dashboard 页面框架 owner：创建 content browser 与 frame，登记挂载句柄并在卸载时移除 frame。 |
| [dashboardToolbarButton.ts](src/modules/dashboardToolbarButton.ts.md) | src/modules/dashboardToolbarButton.ts | Zotero 主窗口工具栏按钮的注入与维护模块，负责为 Dashboard、通用工作流和 SkillRunner 各自创建 XUL browser 按钮，并同步图标与待处理计数徽标。 |
| [feedbackSeam.ts](src/modules/workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [healthGate.ts](scripts/system-e2e/healthGate.ts.md) | scripts/system-e2e/healthGate.ts | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [helpCenterTab.ts](src/modules/helpCenterTab.ts.md) | src/modules/helpCenterTab.ts | 帮助中心标签页模块：在 Zotero 中创建内嵌 browser 标签页加载帮助页面，并通过向 frame 注入的 bridge 对象把在线文档打开、URL 跳转等能力暴露给页面。 |
| [index.ts](src/index.ts.md) | src/index.ts | 插件引导入口：创建 Addon 单例、注入打包资源路径，并通过 defineGlobal 把 Zotero 全局与 ztoolkit 暴露到插件作用域。 |
| [libraryArtifactsColumn.ts](src/modules/libraryArtifactsColumn.ts.md) | src/modules/libraryArtifactsColumn.ts | 为 Zotero 文献库列表注册「文献产物」与「文献评分」两个虚拟列，负责单元格数据供给、渲染、缓存与防抖刷新。 |
| [locale.ts](src/utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [markdownAttachmentTab.ts](src/modules/markdownAttachmentTab.ts.md) | src/modules/markdownAttachmentTab.ts | Markdown 附件阅读器标签页的完整实现：在 Zotero 标签中创建内嵌 browser 加载共享阅读器页面，把文档内容通过 bridge 注入，并在页面脚本加载失败时回退到内联独立 HTML。 |
| [packagedAssetResolver.ts](src/modules/packagedAssetResolver.ts.md) | src/modules/packagedAssetResolver.ts | 打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。 |
| [preferenceScript.ts](src/modules/preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [prefs.ts](src/utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [run-zotero-test-with-mock.ts](scripts/run-zotero-test-with-mock.ts.md) | scripts/run-zotero-test-with-mock.ts | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |
| [runtimeFileRangeReader.ts](src/modules/runtimeFileRangeReader.ts.md) | src/modules/runtimeFileRangeReader.ts | 在 Zotero 沙箱中按字节区间读取大文件的读取器，配合 runtimeFileRangeProtocol 与 worker 实现分段读取，避免一次性载入造成内存峰值。 |
| [runtimeLogManager.ts](src/modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [selectionSample.ts](src/modules/workflow/ui/selectionSample.ts.md) | src/modules/workflow/ui/selectionSample.ts | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [skillRunnerHandshakeProtocol.ts](src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts | 握手协议的契约层：定义请求/响应 schema id、已支持的协议常量集合，以及旧版后端的兼容能力合成与交互文件能力协商逻辑。 |
| [skillRunnerLocalRuntimePreferences.ts](src/modules/preferences/skillRunnerLocalRuntimePreferences.ts.md) | src/modules/preferences/skillRunnerLocalRuntimePreferences.ts | SkillRunner 本地运行时相关的偏好面板绑定，负责安装目录、版本、自动拉取与自动拉起等设置的读写与即时生效。 |
| [skillRunnerRuntimeFeed.ts](src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts.md) | src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts | 本地 SkillRunner 运行时版本源的读取模块：拉取远端 feed 文档、规范化并按平台与架构挑选可用版本，在网络失败时回退到缓存与内置版本常量。 |
| [synthesisWorkbenchTab.ts](src/modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [workflowHostOwners.ts](src/workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowMenu.ts](src/modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowSettingsWebDialog.ts](src/modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |
| [workspaceTab.ts](src/modules/workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |
| [zotero-plugin.config.ts](zotero-plugin.config.ts.md) | zotero-plugin.config.ts | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |
| [ztoolkit.ts](src/utils/ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [build-content-package-feed.ts](scripts/content-package/build-content-package-feed.ts.md) | scripts/content-package/build-content-package-feed.ts | 内容包 feed 构建脚本：从 git 跟踪文件中收集内置工作流与 Skill 源码，打包 zip，并为 stable/beta/dev 各频道生成带 sha256 的 feed JSON。 |
| [healthGate.ts](scripts/system-e2e/healthGate.ts.md) | scripts/system-e2e/healthGate.ts | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [index.ts](src/index.ts.md) | src/index.ts | 插件引导入口：创建 Addon 单例、注入打包资源路径，并通过 defineGlobal 把 Zotero 全局与 ztoolkit 暴露到插件作用域。 |
| [run-zotero-test-with-mock.ts](scripts/run-zotero-test-with-mock.ts.md) | scripts/run-zotero-test-with-mock.ts | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |
| [zotero-plugin.config.ts](zotero-plugin.config.ts.md) | zotero-plugin.config.ts | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |
