
# src/modules/zoteroHostMutationAuthority.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../layers/zotero-host.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/zoteroHostMutationAuthority.ts -->

canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。

规模：997 行
源码：[src/modules/zoteroHostMutationAuthority.ts](../../../../../src/modules/zoteroHostMutationAuthority.ts)

## 符号（21）
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:assertEntryBinding -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:assertStoredAttachmentContentIdentity -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:attemptFromError -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:canonicalMutationDigest -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:configureMutationAuthorityRuntimeForTests -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:confirmedResult -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:executeReservedMutation -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:getMutationOperation -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:interruptedResult -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:listMutationOperations -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:lookupReservedMutation -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:lookupTrustedStoredAttachmentMutation -->
<!-- node: class:src/modules/zoteroHostMutationAuthority.ts:MutationAuthorityAdmissionError -->
<!-- node: class:src/modules/zoteroHostMutationAuthority.ts:MutationAuthorityExecutionError -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:parseStoredResult -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:parseStoredSemanticInput -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:pinVerifiedMutationReceipt -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:pruneTerminalRecords -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:resetMutationAuthorityLiveStateForTests -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:resetMutationAuthorityRuntimeForTests -->
<!-- node: function:src/modules/zoteroHostMutationAuthority.ts:resolveDurableMutation -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertEntryBinding | 函数 | 273–284 | 简单 | validation、persistence、mutation | 0 | 校验 durable 记录与其操作 ID、身份绑定的对应关系。 |
| assertStoredAttachmentContentIdentity | 函数 | 308–326 | 简单 | validation、attachment、identity | 0 | 校验已存附件的内容身份与批准事实一致。 |
| attemptFromError | 函数 | 489–522 | 简单 | error、normalization、mutation | 0 | 把任意异常转换为结构化的 attempt 错误。 |
| canonicalMutationDigest | 函数 | 256–259 | 简单 | hash、mutation、canonical、exported | 0 | 对 mutation 输入做规范化 JSON 摘要，剥离不影响语义的资源型字段。 |
| configureMutationAuthorityRuntimeForTests | 函数 | 982–986 | 简单 | test、seam、mutation | 0 | 注入测试用持久层与运行态配置。 |
| confirmedResult | 函数 | 524–554 | 简单 | mutation、result、factory | 0 | 构造已确认完成的 attempt 结果。 |
| executeReservedMutation | 函数 | 799–935 | 中等 | mutation、execution、reservation、exported | 1 | 执行已预留的 mutation，把 durable insert winner 变为终态证据。 |
| getMutationOperation | 函数 | 626–638 | 简单 | mutation、query、exported | 1 | 按操作 ID 查询 canonical mutation 的当前状态与终态证据。 |
| interruptedResult | 函数 | 562–575 | 简单 | mutation、restart、result | 0 | 构造因进程中断而无法确认的 attempt 结果。 |
| listMutationOperations | 函数 | 640–645 | 简单 | mutation、query、pagination、exported | 0 | 分页列出最近的 canonical mutation 操作。 |
| lookupReservedMutation | 函数 | 716–743 | 简单 | mutation、lookup、reservation、exported | 0 | 查找处于已预留但未提交状态的 mutation。 |
| lookupTrustedStoredAttachmentMutation | 函数 | 652–714 | 中等 | mutation、attachment、lookup、exported | 0 | 查找已通过身份校验的已存附件变更记录。 |
| MutationAuthorityAdmissionError | 类 | 109–120 | 简单 | error、admission、mutation、exported | 0 | 变更准入错误：scope、operationId 或摘要校验失败时在写入前拒绝。 |
| MutationAuthorityExecutionError | 类 | 122–138 | 简单 | error、execution、mutation、exported | 0 | 变更执行错误：携带执行阶段与状态，spawn 等 post-commit 失败也在同一操作上形成终态。 |
| parseStoredResult | 函数 | 286–295 | 简单 | parsing、persistence、result | 0 | 解析持久化的 mutation 结果记录。 |
| parseStoredSemanticInput | 函数 | 297–306 | 简单 | parsing、persistence、semantics | 0 | 解析持久化的语义输入记录并校验其结构。 |
| pinVerifiedMutationReceipt | 函数 | 943–980 | 简单 | mutation、receipt、retention、exported | 0 | 为已核验的 mutation 钉住 receipt，防止过早清理。 |
| pruneTerminalRecords | 函数 | 381–395 | 简单 | persistence、retention、cleanup | 0 | 清理超过保留期的普通终态证据记录，保留 identity binding。 |
| resetMutationAuthorityLiveStateForTests | 函数 | 988–991 | 简单 | test、seam、mutation | 0 | 重置权威层的进程内活动状态。 |
| resetMutationAuthorityRuntimeForTests | 函数 | 993–997 | 简单 | test、seam、mutation | 0 | 重置权威层运行态与注入配置。 |
| resolveDurableMutation | 函数 | 577–624 | 简单 | persistence、mutation、lookup | 0 | 查询并校验一个已持久化操作的 durable 记录。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [pluginStateStore.ts](pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [systemE2ETestRun.ts](systemE2ETestRun.ts.md) | src/modules/systemE2ETestRun.ts | System E2E 测试运行的检测入口：从 Zotero 首选项读取事件上报 URL 与 launch fault 开关，作为 sidecar 走测试私有检查点的判据。 |
| [types.ts](../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](../workflows/workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [healthGate.ts](../../scripts/system-e2e/healthGate.ts.md) | scripts/system-e2e/healthGate.ts | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [hostBridgeCapabilityRegistry.ts](hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [literatureArtifactMigration.ts](literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [researchBundleService.ts](hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [workflowHostClient.ts](synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |
| [workflowHostOwners.ts](../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [zoteroHostCapabilityBroker.ts](zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostTrash.ts](zoteroHost/zoteroHostTrash.ts.md) | src/modules/zoteroHost/zoteroHostTrash.ts | 宿主回收站变更的准备与执行：按 portable ref 解析目标条目、采集变更前版本与实体观察值，先产出无副作用的预检结果，再执行实际的置入回收站。 |
| [zoteroManagedNotes.ts](zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| canonicalMutationDigest | 函数 | 256–259 | 对 mutation 输入做规范化 JSON 摘要，剥离不影响语义的资源型字段。 |
| configureMutationAuthorityRuntimeForTests | 函数 | 982–986 | 注入测试用持久层与运行态配置。 |
| executeReservedMutation | 函数 | 799–935 | 执行已预留的 mutation，把 durable insert winner 变为终态证据。 |
| getMutationOperation | 函数 | 626–638 | 按操作 ID 查询 canonical mutation 的当前状态与终态证据。 |
| listMutationOperations | 函数 | 640–645 | 分页列出最近的 canonical mutation 操作。 |
| lookupReservedMutation | 函数 | 716–743 | 查找处于已预留但未提交状态的 mutation。 |
| lookupTrustedStoredAttachmentMutation | 函数 | 652–714 | 查找已通过身份校验的已存附件变更记录。 |
| MutationAuthorityAdmissionError | 类 | 109–120 | 变更准入错误：scope、operationId 或摘要校验失败时在写入前拒绝。 |
| MutationAuthorityExecutionError | 类 | 122–138 | 变更执行错误：携带执行阶段与状态，spawn 等 post-commit 失败也在同一操作上形成终态。 |
| pinVerifiedMutationReceipt | 函数 | 943–980 | 为已核验的 mutation 钉住 receipt，防止过早清理。 |
| resetMutationAuthorityLiveStateForTests | 函数 | 988–991 | 重置权威层的进程内活动状态。 |
| resetMutationAuthorityRuntimeForTests | 函数 | 993–997 | 重置权威层运行态与注入配置。 |
