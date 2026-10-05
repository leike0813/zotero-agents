
# src/modules/workflow/catalog/workflowRuntime.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/catalog](../../../../../modules/src/modules/workflow/catalog.md)
<!-- node: file:src/modules/workflow/catalog/workflowRuntime.ts -->

工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。
源码：[src/modules/workflow/catalog/workflowRuntime.ts](../../../../../../../src/modules/workflow/catalog/workflowRuntime.ts)

## 符号（11）
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:collectSkillRunnerSkillDependencies -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:ensureDefaultWorkflowDirExistsOnStartup -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:ensureRuntimeStateShape -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:filterLoadedWorkflowsBySkillDependencies -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:getEffectiveWorkflowDir -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:getState -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:loadMergedWorkflowManifests -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:persistWorkflowRegistryStatus -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:readTestWorkflowDirOverride -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:rescanWorkflowRegistry -->
<!-- node: function:src/modules/workflow/catalog/workflowRuntime.ts:summarizeLoadedWorkflows -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectSkillRunnerSkillDependencies | 函数 | 477–500 | 简单 | workflow、manifest、analysis | 1 | 收集工作流 manifest 声明的 Skill 依赖列表，供依赖过滤使用。 |
| ensureDefaultWorkflowDirExistsOnStartup | 函数 | 451–466 | 简单 | workflow、startup、catalog | 0 | 启动时确保默认工作流目录存在并完成首次扫描，避免首屏出现空目录。 |
| ensureRuntimeStateShape | 函数 | 105–144 | 中等 | workflow、normalization、compatibility | 1 | 补全运行时状态对象的缺失字段，保证旧版持久化状态可被当前代码安全读取。 |
| filterLoadedWorkflowsBySkillDependencies | 函数 | 502–549 | 中等 | workflow、catalog、validation、core | 1 | 按已注册的 Skill 依赖过滤工作流，剔除依赖缺失而无法运行的工作流。 |
| getEffectiveWorkflowDir | 函数 | 437–449 | 简单 | workflow、path、resolution、core | 0 | 解析当前生效的工作流目录，dev-local 存在时优先于内置目录。 |
| getState | 函数 | 146–159 | 简单 | workflow、state-management、core | 0 | 返回经过形状补全的工作流运行时状态单例，是目录查询的读取入口。 |
| [loadMergedWorkflowManifests](../../../../../symbols/src/modules/workflow/catalog/workflowRuntime.ts/loadMergedWorkflowManifests.md) | 函数 | 341–435 | 复杂 | workflow、loader、catalog、core | 1 | 加载并合并多个来源的工作流 manifest，处理同名覆盖、来源标记与失败隔离。 |
| persistWorkflowRegistryStatus | 函数 | 308–339 | 中等 | workflow、persistence、registry | 0 | 把注册表状态摘要写入 prefs，使设置页与 Host Bridge 无需重扫即可读取。 |
| readTestWorkflowDirOverride | 函数 | 46–74 | 中等 | workflow、testing、configuration | 0 | 读取测试用工作流目录覆盖项，仅在测试环境中生效，生产路径不参与解析。 |
| [rescanWorkflowRegistry](../../../../../symbols/src/modules/workflow/catalog/workflowRuntime.ts/rescanWorkflowRegistry.md) | 函数 | 551–619 | 中等 | workflow、catalog、registry、core | 3 | 重扫工作流目录并刷新注册表状态，把注册结果与错误摘要持久化供 UI 展示。 |
| summarizeLoadedWorkflows | 函数 | 295–306 | 简单 | workflow、diagnostics、catalog | 1 | 汇总已加载工作流数量、来源分布与错误项，作为注册表状态的摘要内容。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contentPackageSubscription.ts](contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [loader.ts](../../../workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [pluginSkillRegistry.ts](pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRecovery.ts](../../acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [dashboardRuntime.ts](../../dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [pluginSkillRegistry.ts](pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [preferenceScript.ts](../../preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [runSeam.ts](../../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [skillRunnerForegroundContinuation.ts](../../skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerRunStore.ts](../../skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerTaskReconciler.ts](../../skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [synthesisWorkbenchTab.ts](../../synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowDebugProbe.ts](../ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowExecute.ts](../ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowMenu.ts](../ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowSettings.ts](../settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsNormalizer.ts](../settings/workflowSettingsNormalizer.ts.md) | src/modules/workflow/settings/workflowSettingsNormalizer.ts | 针对已加载工作流目录的设置归一化层，在持久化设置与执行时选项中剥离陈旧字段并按当前已注册工作流集合补齐缺失配置。 |
| [workflowVisibility.ts](workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureDefaultWorkflowDirExistsOnStartup | 函数 | 451–466 | 启动时确保默认工作流目录存在并完成首次扫描，避免首屏出现空目录。 |
| getEffectiveWorkflowDir | 函数 | 437–449 | 解析当前生效的工作流目录，dev-local 存在时优先于内置目录。 |
| [rescanWorkflowRegistry](../../../../../symbols/src/modules/workflow/catalog/workflowRuntime.ts/rescanWorkflowRegistry.md) | 函数 | 551–619 | 重扫工作流目录并刷新注册表状态，把注册结果与错误摘要持久化供 UI 展示。 |
