
# packages/synthesis-contracts/src/common.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/common.ts -->

合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。
源码：[packages/synthesis-contracts/src/common.ts](../../../../../../packages/synthesis-contracts/src/common.ts)

## 符号（5）
<!-- node: function:packages/synthesis-contracts/src/common.ts:assertSynthesisExactFields -->
<!-- node: function:packages/synthesis-contracts/src/common.ts:rebuildSynthesisStructuredDiagnostic -->
<!-- node: class:packages/synthesis-contracts/src/common.ts:SynthesisClientError -->
<!-- node: function:packages/synthesis-contracts/src/common.ts:toSynthesisJsonObject -->
<!-- node: function:packages/synthesis-contracts/src/common.ts:toSynthesisJsonValue -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [assertSynthesisExactFields](../../../../symbols/packages/synthesis-contracts/src/common.ts/assertSynthesisExactFields.md) | 函数 | 163–181 | 简单 | 字段精确性、校验、公共基础、核心 | 33 | 断言对象恰好包含必需字段且不含未知字段，是全部合约 DTO 拒绝多余字段的统一入口。 |
| [rebuildSynthesisStructuredDiagnostic](../../../../symbols/packages/synthesis-contracts/src/common.ts/rebuildSynthesisStructuredDiagnostic.md) | 函数 | 183–232 | 中等 | 诊断、合约、结构化、公共基础 | 2 | 重建结构化诊断条目：规范化 code、message、location 与 details，保证诊断输出可比较且有界。 |
| SynthesisClientError | 类 | 61–75 | 简单 | 错误类型、合约、公共基础 | 0 | 合约层统一客户端错误类型，携带 invalid_request 等错误码与人类可读信息，被所有 rebuild* 校验函数抛出。 |
| [toSynthesisJsonObject](../../../../symbols/packages/synthesis-contracts/src/common.ts/toSynthesisJsonObject.md) | 函数 | 144–161 | 简单 | JSON-校验、对象断言、公共基础 | 86 | 在 toSynthesisJsonValue 之上要求结果必须是普通对象，否则以字段定位路径报错。 |
| [toSynthesisJsonValue](../../../../symbols/packages/synthesis-contracts/src/common.ts/toSynthesisJsonValue.md) | 函数 | 77–142 | 复杂 | JSON-校验、公共基础、守卫、核心 | 5 | 把任意运行时值收敛为合法 JSON 值：拒绝 undefined、函数、非有限数字与循环引用，并保留数组空位语义。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-cross-language-contracts.ts](../../../scripts/synthesis/check-synthesis-cross-language-contracts.ts.md) | scripts/synthesis/check-synthesis-cross-language-contracts.ts | 跨语言契约检查脚本：递归比对 TS 契约 schema 与 Rust 侧协议注册表，验证结构、协议引用与必填字段在两种语言实现中保持一致。 |
| [citationGraphApplication.ts](citationGraphApplication.ts.md) | packages/synthesis-contracts/src/citationGraphApplication.ts | 引用图谱应用层合约：定义 slice/metrics/layout/rebuild/refresh-metrics 请求与 inspect、mutation 结果的判别式重建函数，施加统一的字段精确性与规模上限。 |
| [debugMaintenance.ts](debugMaintenance.ts.md) | packages/synthesis-contracts/src/debugMaintenance.ts | 调试与维护合约：定义调试快照、缓存项、操作项与隔离快照结构，提供有界分页构造、诊断重建与两个快照之间的差异比较。 |
| [debugMaintenanceApplication.ts](../../synthesis-application/src/debugMaintenanceApplication.ts.md) | packages/synthesis-application/src/debugMaintenanceApplication.ts | sidecar 调试与维护能力的应用层：聚合 repository 捕获、profiler 结果与 topic canonical store，产出隔离快照、缓存/操作列表及 checkpoint、durable、reset 维护入口。 |
| [exportDelivery.ts](exportDelivery.ts.md) | packages/synthesis-contracts/src/exportDelivery.ts | 宿主导出交付合约：校验导出条目集合（数量、单条与总体字节上限、控制字符、路径形状），并定义导出请求、传输请求与运行工作区物化请求/结果。 |
| [hostRead.ts](hostRead.ts.md) | packages/synthesis-contracts/src/hostRead.ts | 宿主只读合约：定义文献条目分页、按 ref 批量读取、artifact 扫描与就绪度查询、artifact 读取的分页请求与结果重建，以及文献质量评估。 |
| [itemRef.ts](itemRef.ts.md) | packages/synthesis-contracts/src/itemRef.ts | Zotero 条目引用合约：校验 libraryId 与 itemKey 的组合，提供稳定的比较函数、键构造函数与批量重建，供跨边界传递 portable refs。 |
| [librarySnapshot.ts](librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts | Zotero 文献库快照契约：定义快照请求、条目、完成证据与分页结果的 schema 常量、范围/顺序/批量上限，并提供对应的严格重建函数。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |
| [referenceRefreshApplication.ts](referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts | 参考文献刷新应用契约：prepare/apply/page 请求，以及条目、描述符与文献质量快照的严格重建。 |
| [relatedItemsEffect.ts](relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts | 宿主 related-items 批量 effect 契约：定义批次与诊断条数上限，重建 effect 请求、逐条 receipt 与批次结果。 |
| [representativeImageRead.ts](representativeImageRead.ts.md) | packages/synthesis-contracts/src/representativeImageRead.ts | 宿主代表图读取契约：限制内容字节与诊断条数，重建读取请求以及 available / unavailable 两态结果。 |
| [sidecarCanonicalStore.ts](sidecarCanonicalStore.ts.md) | packages/synthesis-contracts/src/sidecarCanonicalStore.ts | 主题 canonical store 快照的 schema 版本与快照重建函数，是 sidecar 与仓库之间的一致性锚点。 |
| [sidecarLifecycle.ts](sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts | sidecar 启动与发现契约：launch config 与 discovery 的 JSON Schema 及严格重建，确保发现记录可被插件安全消费。 |
| [sidecarObservability.ts](sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [sidecarTransfer.ts](sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts | sidecar 传输层契约：分页描述符与 manifest、库节点/参考文献/图节点/边/归属/指标各类页、会话动作与 transfer 状态快照重建。 |
| [sourceReferenceArtifact.ts](sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [synthesisSidecarTransferClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts | sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。 |
| [tagEffect.ts](tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts | 宿主标签 effect 契约：staged binding 解析请求与结果，以及标签 effect 批次请求、逐条 receipt 与批次结果重建。 |
| [tags.ts](tags.ts.md) | packages/synthesis-contracts/src/tags.ts | 标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。 |
| [topicApplication.ts](../../synthesis-application/src/topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts | 主题（topic）应用层：读取主题状态与 bundle 依赖快照，校验候选 bundle 资产完整性，产出主题列表/详情的就绪度与投影视图。 |
| [topicApplication.ts](topicApplication.ts.md) | packages/synthesis-contracts/src/topicApplication.ts | 主题应用契约：apply / list / detail 请求重建，以及主题 ID 清洗、资产 ID 与 UTF-8 字节数等边界校验。 |
| [topicDomain.ts](topicDomain.ts.md) | packages/synthesis-contracts/src/topicDomain.ts | 主题领域模型：topic 定义、resolver 条件、artifact、manifest 与 report 等核心类型集合，是 Synthesis 层的领域类型事实源。 |
| [topics.ts](topics.ts.md) | packages/synthesis-contracts/src/topics.ts | 主题查询契约：list / find / context / resolver / workflow options 的请求与结果重建。 |
| [webDavSync.ts](webDavSync.ts.md) | packages/synthesis-contracts/src/webDavSync.ts | WebDAV 同步状态契约：sync head/state/conflict 的 schema ID 与版本、诊断与冲突报告重建、远端快照指针与路径生成。 |
| [webDavSyncPort.ts](webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts | 宿主 WebDAV 端口契约：连接测试、远端描述、读写与 ensure-collection 的请求结果重建，含托管路径与 base URL 安全校验。 |
| [workbench.ts](workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [assertSynthesisExactFields](../../../../symbols/packages/synthesis-contracts/src/common.ts/assertSynthesisExactFields.md) | 函数 | 163–181 | 断言对象恰好包含必需字段且不含未知字段，是全部合约 DTO 拒绝多余字段的统一入口。 |
| [rebuildSynthesisStructuredDiagnostic](../../../../symbols/packages/synthesis-contracts/src/common.ts/rebuildSynthesisStructuredDiagnostic.md) | 函数 | 183–232 | 重建结构化诊断条目：规范化 code、message、location 与 details，保证诊断输出可比较且有界。 |
| SynthesisClientError | 类 | 61–75 | 合约层统一客户端错误类型，携带 invalid_request 等错误码与人类可读信息，被所有 rebuild* 校验函数抛出。 |
| [toSynthesisJsonObject](../../../../symbols/packages/synthesis-contracts/src/common.ts/toSynthesisJsonObject.md) | 函数 | 144–161 | 在 toSynthesisJsonValue 之上要求结果必须是普通对象，否则以字段定位路径报错。 |
| [toSynthesisJsonValue](../../../../symbols/packages/synthesis-contracts/src/common.ts/toSynthesisJsonValue.md) | 函数 | 77–142 | 把任意运行时值收敛为合法 JSON 值：拒绝 undefined、函数、非有限数字与循环引用，并保留数组空位语义。 |
