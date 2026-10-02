
# src/modules/literatureArtifactMigration.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../layers/zotero-host.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/literatureArtifactMigration.ts -->

文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。
源码：[src/modules/literatureArtifactMigration.ts](../../../../../src/modules/literatureArtifactMigration.ts)

## 符号（8）
<!-- node: function:src/modules/literatureArtifactMigration.ts:createLiteratureArtifactMigrationHostFromZoteroBroker -->
<!-- node: function:src/modules/literatureArtifactMigration.ts:createLiteratureArtifactMigrationService -->
<!-- node: function:src/modules/literatureArtifactMigration.ts:hasVerifiedCanonicalParentSet -->
<!-- node: function:src/modules/literatureArtifactMigration.ts:migrationParentSetEntries -->
<!-- node: function:src/modules/literatureArtifactMigration.ts:mutationResultToMigrationOutcome -->
<!-- node: function:src/modules/literatureArtifactMigration.ts:readLegacyParentSet -->
<!-- node: function:src/modules/literatureArtifactMigration.ts:scanLegacyLibrary -->
<!-- node: function:src/modules/literatureArtifactMigration.ts:stripLegacyPayloadMarkup -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createLiteratureArtifactMigrationHostFromZoteroBroker | 函数 | 891–1002 | 复杂 | broker、迁移、facade | 0 | 基于 ZoteroHostCapabilityBroker 构造迁移宿主 facade，暴露扫描与写入所需的受控入口。 |
| createLiteratureArtifactMigrationService | 函数 | 1443–2495 | 复杂 | 迁移、service、生命周期、用例编排 | 0 | 迁移服务的构造入口：装配宿主、候选计划、批处理执行、运行状态持久化与中断恢复等全部生命周期能力。 |
| hasVerifiedCanonicalParentSet | 函数 | 531–593 | 中等 | canonical、幂等、迁移 | 1 | 判断目标 parent set 是否已存在 canonical 产物，避免重复迁移与 legacy 清理冲突。 |
| migrationParentSetEntries | 函数 | 351–406 | 中等 | 迁移、parent-set、语义输入 | 0 | 构造迁移 parent set 的语义条目集合，确保引用与引用分析产物在同一次写入中提交。 |
| [mutationResultToMigrationOutcome](../../../symbols/src/modules/literatureArtifactMigration.ts/mutationResultToMigrationOutcome.md) | 函数 | 408–479 | 复杂 | mutation、迁移、结果映射 | 1 | 把 canonical mutation 执行结果映射为迁移 outcome，区分成功、冲突、需人工介入等终态。 |
| readLegacyParentSet | 函数 | 653–798 | 复杂 | legacy、扫描、迁移 | 0 | 从库中读取 legacy parent set 的原始 payload 与笔记事实，组装转换器输入。 |
| [scanLegacyLibrary](../../../symbols/src/modules/literatureArtifactMigration.ts/scanLegacyLibrary.md) | 函数 | 800–879 | 复杂 | 扫描、迁移、分页 | 1 | 扫描全库中的 legacy 产物条目，生成带游标的候选计划供 apply 阶段使用。 |
| stripLegacyPayloadMarkup | 函数 | 298–330 | 简单 | legacy、清洗、html | 1 | 剥离 legacy payload 中的标签与样式标记，保留可读文本供迁移备注使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [converter.ts](literatureArtifactMigration/converter.ts.md) | src/modules/literatureArtifactMigration/converter.ts | legacy 文献产物到 canonical 产物的纯转换器：解析旧 payload 标签、匹配 source reference、归一 citation 结构并输出转换分类与诊断。 |
| [index.ts](../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [pluginStateStore.ts](pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [runtimeLogManager.ts](runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [sourceReferenceArtifact.ts](../../packages/synthesis-contracts/src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [types.ts](../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostCapabilityBroker.ts](zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostMutationAuthority.ts](zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |
| [zoteroManagedNotes.ts](zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardSnapshot.ts](dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [converter.ts](literatureArtifactMigration/converter.ts.md) | src/modules/literatureArtifactMigration/converter.ts | legacy 文献产物到 canonical 产物的纯转换器：解析旧 payload 标签、匹配 source reference、归一 citation 结构并输出转换分类与诊断。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createLiteratureArtifactMigrationHostFromZoteroBroker | 函数 | 891–1002 | 基于 ZoteroHostCapabilityBroker 构造迁移宿主 facade，暴露扫描与写入所需的受控入口。 |
| createLiteratureArtifactMigrationService | 函数 | 1443–2495 | 迁移服务的构造入口：装配宿主、候选计划、批处理执行、运行状态持久化与中断恢复等全部生命周期能力。 |
