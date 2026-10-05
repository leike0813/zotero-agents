
# src/utils/prefs.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/prefs.ts -->

插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。
源码：[src/utils/prefs.ts](../../../../../src/utils/prefs.ts)

## 符号（4）
<!-- node: function:src/utils/prefs.ts:clearPref -->
<!-- node: function:src/utils/prefs.ts:getPref -->
<!-- node: function:src/utils/prefs.ts:getPrefName -->
<!-- node: function:src/utils/prefs.ts:setPref -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| clearPref | 函数 | 93–95 | 简单 | preferences、cleanup、utility、exported | 0 | 清除某个首选项键，用于回退到默认值。 |
| getPref | 函数 | 71–73 | 简单 | preferences、read、utility、exported | 0 | 读取插件首选项，类型由调用点约束。 |
| getPrefName | 函数 | 62–64 | 简单 | preferences、naming、utility、exported | 0 | 在 prefs 前缀上拼接出完整的首选项键名，是所有首选项读写的命名入口。 |
| setPref | 函数 | 81–86 | 简单 | preferences、write、persistence、exported | 0 | 写入插件首选项，是持久化配置的通用出口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantExecutionDisplayPolicy.ts](../modules/assistant/publication/assistantExecutionDisplayPolicy.ts.md) | src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts | Assistant Workspace 执行显示策略：管理 live/静默等显示模式及节流间隔，决定工作区更新是否以及多快对外发布。 |
| [assistantTranscriptRenderingPreference.ts](../modules/assistant/publication/assistantTranscriptRenderingPreference.ts.md) | src/modules/assistant/publication/assistantTranscriptRenderingPreference.ts | transcript 分页虚拟化开关的读写封装，直接映射到插件首选项。 |
| [backendManager.ts](../modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [backendsReadonly.ts](../modules/harness/backendsReadonly.ts.md) | src/modules/harness/backendsReadonly.ts | 后端只读快照：从 prefs 读取 backends 配置并归一化为 Harness 专用形状，不做任何 id 重映射或引用同步。 |
| [contentPackageSubscription.ts](../modules/workflow/catalog/contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeAuth.ts](../modules/hostBridge/server/hostBridgeAuth.ts.md) | src/modules/hostBridge/server/hostBridgeAuth.ts | Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。 |
| [hostBridgeCliInstallPrompt.ts](../modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |
| [hostBridgePermissionManager.ts](../modules/hostBridge/permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [hostBridgeServer.ts](../modules/hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [managementAuth.ts](../backends/managementAuth.ts.md) | src/backends/managementAuth.ts | 后端管理认证模块：读写 backends 配置中的管理凭据，生成 Basic Auth 头，保证管理面请求不被明文散落。 |
| [markdownAttachmentOpenProbe.ts](../modules/markdownAttachmentOpenProbe.ts.md) | src/modules/markdownAttachmentOpenProbe.ts | Markdown 附件打开探针：拦截 Zotero 附件的双击/打开动作，识别出 Markdown 附件后转交给内置阅读器标签页。 |
| [modelCache.ts](../providers/skillrunner/modelCache.ts.md) | src/providers/skillrunner/modelCache.ts | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [pluginStateStore.ts](../modules/pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [preferenceScript.ts](../modules/preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [registry.ts](../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeLogManager.ts](../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [selectionSample.ts](../modules/workflow/ui/selectionSample.ts.md) | src/modules/workflow/ui/selectionSample.ts | 调试用选区采样工具：在 Zotero 菜单中注册「采样当前选区」入口，读取 Zotero SelectionContext 后写入临时文件，供工作流输入物化问题排查。 |
| [skillRunFeedback.ts](../modules/skillRunner/run/skillRunFeedback.ts.md) | src/modules/skillRunner/run/skillRunFeedback.ts | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [skillRunnerBackendReachabilityCoordinator.ts](../modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [skillRunnerLocalRuntimeManager.ts](../modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [skillRunnerReadonlyProjection.ts](../modules/harness/skillRunnerReadonlyProjection.ts.md) | src/modules/harness/skillRunnerReadonlyProjection.ts | SkillRunner 只读投影：把插件状态中的 run 记录与 sequence 状态投影成 Harness 可见的运行列表，附带状态语义与技能显示名。 |
| [skillRunnerRuntimeFeed.ts](../modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts.md) | src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts | 本地 SkillRunner 运行时版本源的读取模块：拉取远端 feed 文档、规范化并按平台与架构挑选可用版本，在网络失败时回退到缓存与内置版本常量。 |
| [skillRunnerSkillDisplayRegistry.ts](../modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts.md) | src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts | Skill 展示注册表：保存后端上报的 skill 展示名快照，避免每次渲染都往返后端。 |
| [syncRuntimeCleanup.ts](../modules/synthesis/syncRuntimeCleanup.ts.md) | src/modules/synthesis/syncRuntimeCleanup.ts | Synthesis 同步运行期残留的清理入口：在 sidecar 生命周期结束或首选项关闭后清掉旧的同步临时目录，避免磁盘堆积。 |
| [webDavSyncCredentialPrefs.ts](../modules/synthesis/webDavSyncCredentialPrefs.ts.md) | src/modules/synthesis/webDavSyncCredentialPrefs.ts | WebDAV 凭据的加密存取：基于插件主密钥派生密钥对凭据做加密后写入首选项，读取时解密并做基本校验。 |
| [webDavSyncPrefs.ts](../modules/synthesis/webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts | WebDAV 同步首选项的配置读写与状态投影：校验配置、暴露配置状态、执行连接测试并统一生成诊断信息。 |
| [workflowRuntime.ts](../modules/workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSettings.ts](../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [zoteroMcpServer.ts](../modules/hostBridge/mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| clearPref | 函数 | 93–95 | 清除某个首选项键，用于回退到默认值。 |
| getPref | 函数 | 71–73 | 读取插件首选项，类型由调用点约束。 |
| getPrefName | 函数 | 62–64 | 在 prefs 前缀上拼接出完整的首选项键名，是所有首选项读写的命名入口。 |
| setPref | 函数 | 81–86 | 写入插件首选项，是持久化配置的通用出口。 |
