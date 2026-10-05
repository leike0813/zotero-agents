
# src/utils/runtimeBridge.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/runtimeBridge.ts -->

运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。
源码：[src/utils/runtimeBridge.ts](../../../../../src/utils/runtimeBridge.ts)

## 符号（10）
<!-- node: function:src/utils/runtimeBridge.ts:installRuntimeBridgeOverrideForTests -->
<!-- node: function:src/utils/runtimeBridge.ts:readHiddenDomWindow -->
<!-- node: function:src/utils/runtimeBridge.ts:readWindowFromGlobalVar -->
<!-- node: function:src/utils/runtimeBridge.ts:resolveRuntimeAlert -->
<!-- node: function:src/utils/runtimeBridge.ts:resolveRuntimeHostCapabilities -->
<!-- node: function:src/utils/runtimeBridge.ts:resolveRuntimeToolkit -->
<!-- node: function:src/utils/runtimeBridge.ts:resolveRuntimeWindowCandidates -->
<!-- node: function:src/utils/runtimeBridge.ts:resolveRuntimeZoteroDetails -->
<!-- node: function:src/utils/runtimeBridge.ts:resolveToolkitMember -->
<!-- node: function:src/utils/runtimeBridge.ts:summarizeRuntimeZoteroShape -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| installRuntimeBridgeOverrideForTests | 函数 | 567–571 | 简单 | testing、override、seam、exported | 0 | 安装测试专用的全局桥覆盖，强制指定 Zotero / addon / console 对象。 |
| readHiddenDomWindow | 函数 | 103–118 | 简单 | compatibility、dom、fallback | 0 | 通过隐藏 iframe 的 contentWindow 兜底取到 Zotero chrome 窗口。 |
| readWindowFromGlobalVar | 函数 | 87–101 | 简单 | compatibility、window、zotero-api | 0 | 从 Zotero 常见全局变量（getMainWindow / getMainWindows）读取窗口对象。 |
| resolveRuntimeAlert | 函数 | 543–565 | 简单 | resolution、error-message、compat、exported | 0 | 解析宿主 alert 函数，供错误提示在无 window.alert 时仍可用。 |
| resolveRuntimeHostCapabilities | 函数 | 407–506 | 中等 | capability、compatibility、resolution、exported | 0 | 汇总宿主可用能力（fetch、atob、TextDecoder、FileReader 等），供工作流包能力检测复用。 |
| resolveRuntimeToolkit | 函数 | 508–516 | 简单 | resolution、toolkit、compat、exported | 1 | 定位 ztoolkit 实例，找不到时按名称从 globalThis 兜底解析。 |
| resolveRuntimeWindowCandidates | 函数 | 130–165 | 简单 | compatibility、window、resolution、exported | 0 | 按 Zotero 主窗口、隐藏 DOM 窗口与全局变量暴露方式枚举候选窗口。 |
| resolveRuntimeZoteroDetails | 函数 | 312–380 | 中等 | compatibility、resolution、diagnostics、exported | 0 | 按能力形状打分选出最合适的 Zotero 引用，并返回打分明细供诊断。 |
| resolveToolkitMember | 函数 | 518–527 | 简单 | toolkit、resolution、compat、exported | 0 | 从 toolkit 取出成员方法，兼容直接属性与 getGlobal 两种形态。 |
| summarizeRuntimeZoteroShape | 函数 | 272–300 | 简单 | introspection、compat、diagnostics、exported | 0 | 描述候选 Zotero 对象的形状特征（是否有 Preferences、HTTP 等关键成员）。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](../modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpRuntimePromptTemplates.ts](../modules/acp/skillRun/acpRuntimePromptTemplates.ts.md) | src/modules/acp/skillRun/acpRuntimePromptTemplates.ts | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |
| [acpSkillPatchTemplates.ts](../modules/acp/skillRun/acpSkillPatchTemplates.ts.md) | src/modules/acp/skillRun/acpSkillPatchTemplates.ts | Skill Patch 模板模块：把内置 patch 模板物化到 runtime 目录，供不同 agent family 修补 SKILL.md 行为差异。 |
| [archive.ts](../workflows/archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [assistantWorkspaceSidebar.ts](../modules/assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [backendManager.ts](../modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [bibliography.ts](../workflows/bibliography.ts.md) | src/workflows/bibliography.ts | 工作流参考文献渲染 owner：按 bibliography 格式调用 Zotero 内置 export translator 渲染书目，并规范化格式选项与 portable ref 输入。 |
| [builtinWorkflowSync.ts](../modules/workflow/catalog/builtinWorkflowSync.ts.md) | src/modules/workflow/catalog/builtinWorkflowSync.ts | 内置工作流目录同步：比对 workflows_builtin 随插件分发的定义与本地已安装工作流，按版本与内容摘要判定升级、跳过或失败，并经 runtimeBridge 把变更投到 Workflow Host。 |
| [client.ts](../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [clipboard.ts](../workflows/clipboard.ts.md) | src/workflows/clipboard.ts | 工作流剪贴板 owner：优先解析 Gecko 剪贴板、次选 navigator.clipboard，并提供纯内存 adapter 作为降级实现，统一的读写限额与取消语义在此收敛。 |
| [dashboardFrame.ts](../modules/dashboard/dashboardFrame.ts.md) | src/modules/dashboard/dashboardFrame.ts | Dashboard 页面框架 owner：创建 content browser 与 frame，登记挂载句柄并在卸载时移除 frame。 |
| [feedbackSeam.ts](../modules/workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [filePicker.ts](../platform/filePicker.ts.md) | src/platform/filePicker.ts | 跨运行时文件选择器：优先使用宿主提供的原生多选文件对话框，在不可用时回退到 toolkit 的 FilePicker，并负责挑选可用的 parent window。 |
| [helpCenterTab.ts](../modules/helpCenterTab.ts.md) | src/modules/helpCenterTab.ts | 帮助中心标签页模块：在 Zotero 中创建内嵌 browser 标签页加载帮助页面，并通过向 frame 注入的 bridge 对象把在线文档打开、URL 跳转等能力暴露给页面。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeCapabilityRegistry.ts](../modules/hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [loader.ts](../workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [managementClient.ts](../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [markdownAttachmentTab.ts](../modules/markdownAttachmentTab.ts.md) | src/modules/markdownAttachmentTab.ts | Markdown 附件阅读器标签页的完整实现：在 Zotero 标签中创建内嵌 browser 加载共享阅读器页面，把文档内容通过 bridge 注入，并在页面脚本加载失败时回退到内联独立 HTML。 |
| [messageFormatter.ts](../modules/workflowExecution/messageFormatter.ts.md) | src/modules/workflowExecution/messageFormatter.ts | 工作流消息本地化格式化器：先查 addon locale 资源，缺失时回落到调用方提供的 fallback 文案，并组装出符合 WorkflowMessageFormatter 契约的格式化函数。 |
| [modelCache.ts](../providers/skillrunner/modelCache.ts.md) | src/providers/skillrunner/modelCache.ts | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [runtime.ts](../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [selectionSample.ts](../modules/workflow/ui/selectionSample.ts.md) | src/modules/workflow/ui/selectionSample.ts | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [skillRunnerLocalDeployDebugDialog.ts](../modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts | 本地运行时部署调试对话框：把调试日志条目渲染为可读列表，支持复制单条详情或整段控制台文本，便于排查一键部署失败。 |
| [synthesisWorkbenchTab.ts](../modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [workflowDebugProbe.ts](../modules/workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowEditorHost.ts](../modules/workflow/ui/workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |
| [workflowHostOwners.ts](../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowInputPlanning.ts](../workflows/workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowNoteImagePreparation.ts](../workflows/workflowNoteImagePreparation.ts.md) | src/workflows/workflowNoteImagePreparation.ts | 笔记图片准备：解码并校验 base64 图片、推断 MIME、按有界尺寸与 token 化引用生成 prepared image，供后续在原生事务中导入为笔记附件。 |
| [workflowRuntime.ts](../modules/workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowRuntimeBridge.ts](../modules/workflow/catalog/workflowRuntimeBridge.ts.md) | src/modules/workflow/catalog/workflowRuntimeBridge.ts | 工作流运行时桥：向工作流包暴露一个极小的宿主能力面（appendRuntimeLog 与 showToast），同时写入 globalThis 与 addon 对象，供工作流包在无 import 权限下调用宿主。 |
| [workflowSettingsWebDialog.ts](../modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |
| [workspaceTab.ts](../modules/workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroLibraryPageQuery.ts](../modules/zoteroHost/zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |
| [ztoolkit.ts](ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| installRuntimeBridgeOverrideForTests | 函数 | 567–571 | 安装测试专用的全局桥覆盖，强制指定 Zotero / addon / console 对象。 |
| resolveRuntimeAlert | 函数 | 543–565 | 解析宿主 alert 函数，供错误提示在无 window.alert 时仍可用。 |
| resolveRuntimeHostCapabilities | 函数 | 407–506 | 汇总宿主可用能力（fetch、atob、TextDecoder、FileReader 等），供工作流包能力检测复用。 |
| resolveRuntimeToolkit | 函数 | 508–516 | 定位 ztoolkit 实例，找不到时按名称从 globalThis 兜底解析。 |
| resolveRuntimeWindowCandidates | 函数 | 130–165 | 按 Zotero 主窗口、隐藏 DOM 窗口与全局变量暴露方式枚举候选窗口。 |
| resolveRuntimeZoteroDetails | 函数 | 312–380 | 按能力形状打分选出最合适的 Zotero 引用，并返回打分明细供诊断。 |
| resolveToolkitMember | 函数 | 518–527 | 从 toolkit 取出成员方法，兼容直接属性与 getGlobal 两种形态。 |
| summarizeRuntimeZoteroShape | 函数 | 272–300 | 描述候选 Zotero 对象的形状特征（是否有 Preferences、HTTP 等关键成员）。 |
