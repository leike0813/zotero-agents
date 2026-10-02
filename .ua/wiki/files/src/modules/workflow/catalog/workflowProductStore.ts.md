
# src/modules/workflow/catalog/workflowProductStore.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/catalog](../../../../../modules/src/modules/workflow/catalog.md)
<!-- node: file:src/modules/workflow/catalog/workflowProductStore.ts -->

工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。
源码：[src/modules/workflow/catalog/workflowProductStore.ts](../../../../../../../src/modules/workflow/catalog/workflowProductStore.ts)

## 符号（8）
<!-- node: function:src/modules/workflow/catalog/workflowProductStore.ts:assertDigestOwnership -->
<!-- node: function:src/modules/workflow/catalog/workflowProductStore.ts:buildSkillRunFeedbackExportMarkdown -->
<!-- node: function:src/modules/workflow/catalog/workflowProductStore.ts:createProductStorageApi -->
<!-- node: function:src/modules/workflow/catalog/workflowProductStore.ts:exportWorkflowProductToDirectory -->
<!-- node: function:src/modules/workflow/catalog/workflowProductStore.ts:initializeWorkflowProductStorage -->
<!-- node: function:src/modules/workflow/catalog/workflowProductStore.ts:migrateLegacyProduct -->
<!-- node: function:src/modules/workflow/catalog/workflowProductStore.ts:readProductAssetPreview -->
<!-- node: function:src/modules/workflow/catalog/workflowProductStore.ts:resolveManagedWorkflowProductAsset -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertDigestOwnership | 函数 | 428–451 | 中等 | 持久化、内容摘要、安全 | 0 | 校验资产路径归属声明的 digest 与实际内容一致，阻止跨产品越权引用。 |
| buildSkillRunFeedbackExportMarkdown | 函数 | 542–582 | 中等 | 导出、markdown、skill 反馈 | 0 | 把 skill run 反馈产品汇总为可导出的 Markdown，含审计头与逐条正文。 |
| createProductStorageApi | 函数 | 727–926 | 复杂 | 持久化、api 工厂、核心 | 0 | 构造产品存储 API：注册、查询、列出、删除与资产读取，是工作流产物的唯一对外写入面。 |
| exportWorkflowProductToDirectory | 函数 | 601–657 | 中等 | 导出、资产写出、工作流目录 | 0 | 将工作流产品连同资产导出到用户指定目录，写入前做路径与覆盖检查。 |
| initializeWorkflowProductStorage | 函数 | 1138–1188 | 中等 | 初始化、迁移、持久化 | 0 | 初始化产品存储：建目录、执行必要迁移并置就绪标记，未就绪时拒绝写入。 |
| migrateLegacyProduct | 函数 | 1019–1120 | 复杂 | 迁移、schema 演进、持久化 | 0 | 把旧版产品记录迁移到当前 schema，转换资产路径与摘要字段并保留可追溯来源。 |
| readProductAssetPreview | 函数 | 928–1009 | 复杂 | 预览、资产读取、有界读取 | 0 | 读取产品资产预览内容，按类型给出有界的文本或二进制摘要供 Dashboard 展示。 |
| resolveManagedWorkflowProductAsset | 函数 | 453–463 | 简单 | 持久化、资产解析、路径安全 | 0 | 按资产 ID 解析托管资产的真实本地路径，并做归属与存在性校验。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardWireContract.ts](../../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [pluginStateStore.ts](../../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [resultContext.ts](../../workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePlatform.ts](../../../platform/runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeCapabilityRegistry.ts](../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [runtime.ts](../../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [runtimePersistenceGovernance.ts](../../runtimePersistenceGovernance.ts.md) | src/modules/runtimePersistenceGovernance.ts | 运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。 |
| [skillRunFeedback.ts](../../skillRunner/run/skillRunFeedback.ts.md) | src/modules/skillRunner/run/skillRunFeedback.ts | Skill run 反馈收集：按用户开关从运行结果与工作流产物中定位反馈文件，作为 SkillRunner 兼容性续跑的候选。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSkillRunFeedbackExportMarkdown | 函数 | 542–582 | 把 skill run 反馈产品汇总为可导出的 Markdown，含审计头与逐条正文。 |
| createProductStorageApi | 函数 | 727–926 | 构造产品存储 API：注册、查询、列出、删除与资产读取，是工作流产物的唯一对外写入面。 |
| exportWorkflowProductToDirectory | 函数 | 601–657 | 将工作流产品连同资产导出到用户指定目录，写入前做路径与覆盖检查。 |
| initializeWorkflowProductStorage | 函数 | 1138–1188 | 初始化产品存储：建目录、执行必要迁移并置就绪标记，未就绪时拒绝写入。 |
| readProductAssetPreview | 函数 | 928–1009 | 读取产品资产预览内容，按类型给出有界的文本或二进制摘要供 Dashboard 展示。 |
| resolveManagedWorkflowProductAsset | 函数 | 453–463 | 按资产 ID 解析托管资产的真实本地路径，并做归属与存在性校验。 |
