
# src/modules/workflow/catalog/pluginSkillRegistry.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/catalog](../../../../../modules/src/modules/workflow/catalog.md)
<!-- node: file:src/modules/workflow/catalog/pluginSkillRegistry.ts -->

插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。
源码：[src/modules/workflow/catalog/pluginSkillRegistry.ts](../../../../../../../src/modules/workflow/catalog/pluginSkillRegistry.ts)

## 符号（6）
<!-- node: function:src/modules/workflow/catalog/pluginSkillRegistry.ts:collectCandidates -->
<!-- node: function:src/modules/workflow/catalog/pluginSkillRegistry.ts:computeDirectoryChecksum -->
<!-- node: function:src/modules/workflow/catalog/pluginSkillRegistry.ts:inspectCandidate -->
<!-- node: function:src/modules/workflow/catalog/pluginSkillRegistry.ts:resolvePluginSkillRoots -->
<!-- node: function:src/modules/workflow/catalog/pluginSkillRegistry.ts:scanPluginSkillRegistry -->
<!-- node: function:src/modules/workflow/catalog/pluginSkillRegistry.ts:scanPluginSkillRegistryImpl -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectCandidates | 函数 | 425–470 | 中等 | skill 注册表、扫描、优先级 | 0 | 遍历各 Skill 根目录收集候选条目，按来源优先级排序。 |
| computeDirectoryChecksum | 函数 | 271–322 | 中等 | 内容摘要、去重、skill 注册表 | 0 | 对 skill 目录内容计算稳定校验和，用于判活与去重，不受 mtime 影响。 |
| inspectCandidate | 函数 | 324–423 | 复杂 | skill 注册表、校验、诊断 | 0 | 检查单个 skill 候选：读取 frontmatter、校验 schema 资产并生成可读诊断。 |
| resolvePluginSkillRoots | 函数 | 118–137 | 简单 | skill 注册表、目录解析、优先级 | 0 | 解析插件 Skill 的内置根与用户根目录，确定扫描范围与优先级。 |
| scanPluginSkillRegistry | 函数 | 623–646 | 中等 | skill 注册表、入口、扫描 | 0 | 对外扫描入口：按输入根集合返回去重后的 Skill 清单与诊断信息。 |
| scanPluginSkillRegistryImpl | 函数 | 477–621 | 复杂 | skill 注册表、打包、主流程 | 0 | 扫描实现主体：收集、去重、生成可分发清单并写入 Host Bridge bundle 契约结构。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillSchemaAssets.ts](../../acp/skillRun/acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |
| [contentPackageSubscription.ts](contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [hostBridgePluginSkillBundle.ts](../../hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |
| [hostBridgePluginSkillBundleContract.ts](../../../shared/hostBridgePluginSkillBundleContract.ts.md) | src/shared/hostBridgePluginSkillBundleContract.ts | Host Bridge 与插件之间 Skill bundle 的共享契约类型定义，约束 bundle 条目结构与校验函数在两侧保持一致。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [workflowRuntime.ts](workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatSkillInjection.ts](../../acp/chat/acpChatSkillInjection.ts.md) | src/modules/acp/chat/acpChatSkillInjection.ts | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [acpSharedSkillCatalog.ts](../../acp/skillRun/acpSharedSkillCatalog.ts.md) | src/modules/acp/skillRun/acpSharedSkillCatalog.ts | ACP 共享 Skill 目录：聚合插件 Skill registry 与资源清单，生成本次会话可用的共享 Skill 列表。 |
| [acpSkillMaterializer.ts](../../acp/skillRun/acpSkillMaterializer.ts.md) | src/modules/acp/skillRun/acpSkillMaterializer.ts | Skill 物化器：把 Skill 目录（含资源清单）写入 runtime 工作区，并按 agent family 决定是否需要薄代理 Skill。 |
| [acpSkillResourceManifest.ts](../../acp/skillRun/acpSkillResourceManifest.ts.md) | src/modules/acp/skillRun/acpSkillResourceManifest.ts | Skill 资源清单：列举单个 Skill 声明的附带资源文件，供物化与校验阶段核对完整性。 |
| [acpSkillRunnerOrchestrator.ts](../../acp/skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [hostBridgeWorkflowAgentRun.ts](../../hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [preparationSeam.ts](../../workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [skillPackageBundler.ts](../../../providers/skillrunner/skillPackageBundler.ts.md) | src/providers/skillrunner/skillPackageBundler.ts | SkillRunner 侧 skill 包打包：把插件 Skill 注册表中的条目组装成 zip 包，经 zipTransport 发送给旧版 SkillRunner 后端。 |
| [workflowRuntime.ts](workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolvePluginSkillRoots | 函数 | 118–137 | 解析插件 Skill 的内置根与用户根目录，确定扫描范围与优先级。 |
| scanPluginSkillRegistry | 函数 | 623–646 | 对外扫描入口：按输入根集合返回去重后的 Skill 清单与诊断信息。 |
