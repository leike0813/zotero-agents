
# src/providers/skillrunner/modelCache.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner](../../../../modules/src/providers/skillrunner.md)
<!-- node: file:src/providers/skillrunner/modelCache.ts -->

SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。
源码：[src/providers/skillrunner/modelCache.ts](../../../../../../src/providers/skillrunner/modelCache.ts)

## 符号（9）
<!-- node: function:src/providers/skillrunner/modelCache.ts:appendSkillRunnerModelCacheLog -->
<!-- node: function:src/providers/skillrunner/modelCache.ts:buildSkillRunnerRequestHeaders -->
<!-- node: function:src/providers/skillrunner/modelCache.ts:parseEngineModelsPayload -->
<!-- node: function:src/providers/skillrunner/modelCache.ts:parseModelCacheEntry -->
<!-- node: function:src/providers/skillrunner/modelCache.ts:refreshAllSkillRunnerModelCaches -->
<!-- node: function:src/providers/skillrunner/modelCache.ts:refreshSkillRunnerModelCacheForBackend -->
<!-- node: function:src/providers/skillrunner/modelCache.ts:splitProviderModel -->
<!-- node: function:src/providers/skillrunner/modelCache.ts:startSkillRunnerModelCacheAutoRefresh -->
<!-- node: function:src/providers/skillrunner/modelCache.ts:upsertSkillRunnerModelCacheEntry -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendSkillRunnerModelCacheLog | 函数 | 245–278 | 简单 | logging、diagnostics、cache | 0 | 把模型缓存诊断信息写入 runtimeLog，并遵守允许的日志级别。 |
| buildSkillRunnerRequestHeaders | 函数 | 216–234 | 简单 | http、headers、skillrunner | 0 | 构造模型查询请求头，复用后端鉴权并声明可接受的响应类型。 |
| parseEngineModelsPayload | 函数 | 301–341 | 中等 | parsing、models、skillrunner | 0 | 解析单个引擎的模型清单响应，映射为内部模型结构并过滤废弃项。 |
| parseModelCacheEntry | 函数 | 105–178 | 中等 | parsing、cache、validation | 0 | 解析单条模型缓存记录，校验版本、baseUrl 与各引擎模型数组结构。 |
| refreshAllSkillRunnerModelCaches | 函数 | 575–624 | 中等 | cache、refresh、orchestration、exported | 0 | 串行刷新全部已启用 SkillRunner 后端的模型缓存，单个失败不影响其余后端。 |
| refreshSkillRunnerModelCacheForBackend | 函数 | 423–573 | 复杂 | cache、refresh、skillrunner、exported | 0 | 针对单个后端刷新模型缓存：请求引擎与模型、归一化后写入首选项并记录诊断日志。 |
| splitProviderModel | 函数 | 53–74 | 简单 | parsing、models、normalization | 0 | 把后端上报的 provider/model 字符串拆分为结构化字段，容忍多种分隔写法。 |
| startSkillRunnerModelCacheAutoRefresh | 函数 | 640–667 | 简单 | scheduling、cache、governance、exported | 0 | 启动模型缓存的定时自动刷新，并把定时器登记到后台刷新治理。 |
| upsertSkillRunnerModelCacheEntry | 函数 | 394–414 | 简单 | cache、upsert、prefs、exported | 0 | 按 backendId + baseUrl 幂等写入缓存条目。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prefs.ts](../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [registry.ts](../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeBridge.ts](../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeLogManager.ts](../../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](../../modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [dashboardActions.ts](../../modules/dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [hooks.ts](../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [modelCatalog.ts](modelCatalog.ts.md) | src/providers/skillrunner/modelCatalog.ts | SkillRunner 模型目录：解析静态 manifest 与远端快照，展开 engine/provider/model 层级并把模型规格归一为 UI 与运行时可用形态。 |
| [skillRunnerAsyncLifecycle.ts](../../modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts.md) | src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts | SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。 |
| [skillRunnerLocalRuntimeManager.ts](../../modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [testRuntimeCleanup.ts](../../modules/testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowSettingsWebDialog.ts](../../modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| refreshAllSkillRunnerModelCaches | 函数 | 575–624 | 串行刷新全部已启用 SkillRunner 后端的模型缓存，单个失败不影响其余后端。 |
| refreshSkillRunnerModelCacheForBackend | 函数 | 423–573 | 针对单个后端刷新模型缓存：请求引擎与模型、归一化后写入首选项并记录诊断日志。 |
| startSkillRunnerModelCacheAutoRefresh | 函数 | 640–667 | 启动模型缓存的定时自动刷新，并把定时器登记到后台刷新治理。 |
| upsertSkillRunnerModelCacheEntry | 函数 | 394–414 | 按 backendId + baseUrl 幂等写入缓存条目。 |
