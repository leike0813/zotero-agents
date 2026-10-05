
# src/modules/synthesis/workbench/synthesisWorkbenchTab.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/workbench](../../../../../modules/src/modules/synthesis/workbench.md)
<!-- node: file:src/modules/synthesis/workbench/synthesisWorkbenchTab.ts -->

Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。
源码：[src/modules/synthesis/workbench/synthesisWorkbenchTab.ts](../../../../../../../src/modules/synthesis/workbench/synthesisWorkbenchTab.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backgroundRefreshGovernance.ts](../../backgroundRefreshGovernance.ts.md) | src/modules/backgroundRefreshGovernance.ts | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [builtinTagPolicy.ts](../builtinTagPolicy.ts.md) | src/modules/synthesis/builtinTagPolicy.ts | Synthesis 内置状态标签策略的 SSOT：定义 status facet 的固定标签集合、可变/不可变字段，并在词表保存与协议写回时强制保护这些内置语义不被用户覆盖。 |
| [citationGraphCrashJournal.ts](../debug/citationGraphCrashJournal.ts.md) | src/modules/synthesis/debug/citationGraphCrashJournal.ts | Citation Graph 构建崩溃日志（crash journal）的读写模块：把构建期崩溃的诊断片段以有界 journal 形式落盘，供 System E2E 测试与 debug 模式回溯定位失败根因。 |
| [dashboardHost.ts](../../dashboardHost.ts.md) | src/modules/dashboardHost.ts | 任务 Dashboard 的宿主装配层：既支持在独立 Zotero 窗口中以 DialogHelper 打开，也支持挂载到外部传入的 embeddedRoot 容器，并把外部的选择动作转接给 Dashboard 运行时。 |
| [defaultClient.ts](../../synthesisClient/defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [feedbackSeam.ts](../../workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [guardedSqlite.ts](../../guardedSqlite.ts.md) | src/modules/guardedSqlite.ts | 受保护的 SQLite 连接封装：设置 busy timeout、对 SQLITE_BUSY 做有界重试，并暴露统一的连接获取入口供 pluginStateStore 使用。 |
| [index.ts](../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [itemObserver.ts](../itemObserver.ts.md) | src/modules/synthesis/itemObserver.ts | 监听 Zotero 条目与子笔记变更，识别文献评分等 managed note 变更并发出 Synthesis 读模型失效通知。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [packagedAssetResolver.ts](../../packagedAssetResolver.ts.md) | src/modules/packagedAssetResolver.ts | 打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeCompatibility.ts](../../../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [synthesisCitationGraphWindow.ts](../../../shared/synthesisCitationGraphWindow.ts.md) | src/shared/synthesisCitationGraphWindow.ts | Citation Graph 窗口模型：定义有界窗口状态（generation、cursor、hover-only 集合与总量计数）与严格的 patch 合并规则，是宿主与页面共享的图谱分页数据契约。 |
| [synthesisProductionOwner.ts](../production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisSidecarRuntimeSupervisor.ts](../sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [synthesisSidecarTrace.ts](../sidecar/synthesisSidecarTrace.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTrace.ts | sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。 |
| [synthesisWorkbenchI18n.ts](../../../synthesisWorkbenchI18n.ts.md) | src/synthesisWorkbenchI18n.ts | Synthesis 工作台文案目录：以默认英文消息表为 SSOT，定义全部消息键，并把 sidecar 失败码投影为用户可读的失败卡片文案。 |
| [synthesisWorkbenchInvalidation.ts](synthesisWorkbenchInvalidation.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts | 工作台失效广播：维护 sidecar 变化监听者集合，把受影响的 Surface 名单、来源引用与原因一次性广播出去，供各区域按自身 signature 决定是否重渲染。 |
| [synthesisWorkbenchWireContract.ts](../../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [systemE2ETestRun.ts](../../systemE2ETestRun.ts.md) | src/modules/systemE2ETestRun.ts | System E2E 测试运行的检测入口：从 Zotero 首选项读取事件上报 URL 与 launch fault 开关，作为 sidecar 走测试私有检查点的判据。 |
| [uiModel.ts](../uiModel.ts.md) | src/modules/synthesis/uiModel.ts | Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。 |
| [workbenchUiAdapter.ts](../../synthesisClient/workbenchUiAdapter.ts.md) | src/modules/synthesisClient/workbenchUiAdapter.ts | 工作台 UI 适配层：把客户端侧的 workbench 读取结果与图谱失败翻译为 UI 可直接消费的形态，包括图谱布局失败的分类、忙状态识别与 read state 构造。 |
| [workflowExecute.ts](../../workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowRuntime.ts](../../workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [workspaceTab.ts](../../workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [closeSynthesisWorkbenchTab](../../../../../symbols/globals.md) | 函数 | 4464–4471 | 关闭工作台标签页并执行运行时清理，释放其持有的全部资源。 |
| [mountSynthesisWorkbenchRuntime](../../../../../symbols/globals.md) | 函数 | 4249–4301 | 在工作台页面中挂载运行时：创建 browser、注入 bridge、启动握手并注册各类监听。 |
| [notifySynthesisWorkbenchLibraryItemsChanged](../../../../../symbols/globals.md) | 函数 | 703–729 | Zotero 库条目变化时通知工作台失效相关 Surface，触发 library read model 的重新投影。 |
| [openSynthesisWorkbenchTab](../../../../../symbols/globals.md) | 函数 | 4303–4379 | 打开或聚焦 Synthesis 工作台标签页：已打开则复用，未打开则创建新标签并挂载运行时。 |
