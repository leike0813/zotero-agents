
# src/modules/pluginStateStore.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/pluginStateStore.ts -->

插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。
源码：[src/modules/pluginStateStore.ts](../../../../../src/modules/pluginStateStore.ts)

## 符号（5）
<!-- node: function:src/modules/pluginStateStore.ts:buildZoteroAdapter -->
<!-- node: function:src/modules/pluginStateStore.ts:ensureDirectoryZotero -->
<!-- node: function:src/modules/pluginStateStore.ts:getAdapter -->
<!-- node: function:src/modules/pluginStateStore.ts:inspectPluginStateStoreCounts -->
<!-- node: function:src/modules/pluginStateStore.ts:migrateLegacyPrefsIntoSqlite -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildZoteroAdapter | 函数 | 411–584 | 复杂 | persistence、sqlite、adapter、zotero | 0 | 构建 Zotero 运行时下的 SQLite adapter：打开数据库、注册语句、暴露受保护的执行入口。 |
| ensureDirectoryZotero | 函数 | 357–390 | 中等 | persistence、file-io、zotero、bootstrap | 0 | 在 Zotero 运行时中创建插件数据目录，处理并发创建与已存在两种情况。 |
| getAdapter | 函数 | 747–786 | 中等 | persistence、lazy-init、adapter、testability | 0 | 惰性取得并缓存当前 adapter，测试注入的工厂优先于真实 Zotero 实现。 |
| inspectPluginStateStoreCounts | 函数 | 1001–1050 | 中等 | persistence、diagnostics、metrics、inspection | 0 | 统计各表的行数与占用，支撑运维诊断与保留策略巡检。 |
| migrateLegacyPrefsIntoSqlite | 函数 | 631–707 | 复杂 | persistence、migration、sqlite、compatibility | 0 | 把旧版 prefs 中的分离 agent run 状态一次性迁入 SQLite，是插件历史数据兼容的收口点。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [core.ts](pluginStateStore/core.ts.md) | src/modules/pluginStateStore/core.ts | pluginStateStore 的底层核心：SQLite 打开、连接复用、事务辅助与通用类型定义。 |
| [diagnosticVerbosity.ts](diagnosticVerbosity.ts.md) | src/modules/diagnosticVerbosity.ts | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [guardedSqlite.ts](guardedSqlite.ts.md) | src/modules/guardedSqlite.ts | 受保护的 SQLite 连接封装：设置 busy timeout、对 SQLITE_BUSY 做有界重试，并暴露统一的连接获取入口供 pluginStateStore 使用。 |
| [literatureMigrationTables.ts](pluginStateStore/literatureMigrationTables.ts.md) | src/modules/pluginStateStore/literatureMigrationTables.ts | 文献库迁移相关数据表的建表语句、schema 版本与读写封装，为 Dashboard 本地迁移服务提供持久化支撑。 |
| [mutationAuthorityTable.ts](pluginStateStore/mutationAuthorityTable.ts.md) | src/modules/pluginStateStore/mutationAuthorityTable.ts | 变更权威表（mutation authority）：持久化 canonical mutation 的 scope/operationId/语义摘要、终态证据与 identity binding，是受审批写入的唯一事实源。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [prefs.ts](../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [runTables.ts](pluginStateStore/runTables.ts.md) | src/modules/pluginStateStore/runTables.ts | 工作流运行记录表：保存 run 的状态、阶段与诊断信息，并在 debug 模式或性能 profiler 打开时附加审计字段。 |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [taskTables.ts](pluginStateStore/taskTables.ts.md) | src/modules/pluginStateStore/taskTables.ts | 任务表层：任务队列、任务状态迁移、附件与产物元数据的持久化读写，是后台任务恢复与保留策略的主要落点。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConversationStore.ts](acp/chat/acpConversationStore.ts.md) | src/modules/acp/chat/acpConversationStore.ts | ACP Chat 会话状态的持久化事实源：负责会话索引与 conversation state 的读写删除、快照反序列化归一化，并协调 transcript 存储路径与 pluginStateStore 的 ACP 域记录。 |
| [acpSkillRunPersistence.ts](acp/skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunStore.ts](acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [hostBridgeOperationStore.ts](hostBridge/server/hostBridgeOperationStore.ts.md) | src/modules/hostBridge/server/hostBridgeOperationStore.ts | Host Bridge 服务端操作存储：基于 pluginStateStore 记录 Bridge 操作的 view 与 receipt，并按任务保留策略清理过期记录。 |
| [hostBridgeWorkflowAgentRunStore.ts](hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts | Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。 |
| [literatureArtifactMigration.ts](literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [literatureMigrationTables.ts](pluginStateStore/literatureMigrationTables.ts.md) | src/modules/pluginStateStore/literatureMigrationTables.ts | 文献库迁移相关数据表的建表语句、schema 版本与读写封装，为 Dashboard 本地迁移服务提供持久化支撑。 |
| [mutationAuthorityTable.ts](pluginStateStore/mutationAuthorityTable.ts.md) | src/modules/pluginStateStore/mutationAuthorityTable.ts | 变更权威表（mutation authority）：持久化 canonical mutation 的 scope/operationId/语义摘要、终态证据与 identity binding，是受审批写入的唯一事实源。 |
| [runTables.ts](pluginStateStore/runTables.ts.md) | src/modules/pluginStateStore/runTables.ts | 工作流运行记录表：保存 run 的状态、阶段与诊断信息，并在 debug 模式或性能 profiler 打开时附加审计字段。 |
| [runtimePersistenceGovernance.ts](runtimePersistenceGovernance.ts.md) | src/modules/runtimePersistenceGovernance.ts | 运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。 |
| [sequenceStateStore.ts](workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [skillRunnerRunStore.ts](skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [taskTables.ts](pluginStateStore/taskTables.ts.md) | src/modules/pluginStateStore/taskTables.ts | 任务表层：任务队列、任务状态迁移、附件与产物元数据的持久化读写，是后台任务恢复与保留策略的主要落点。 |
| [testRuntimeCleanup.ts](testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowProductStore.ts](workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [zoteroHostMutationAuthority.ts](zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| inspectPluginStateStoreCounts | 函数 | 1001–1050 | 统计各表的行数与占用，支撑运维诊断与保留策略巡检。 |
