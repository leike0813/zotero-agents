
# toSynthesisJsonObject
<!-- node: function:packages/synthesis-contracts/src/common.ts:toSynthesisJsonObject -->

在 toSynthesisJsonValue 之上要求结果必须是普通对象，否则以字段定位路径报错。
类型：函数  
复杂度：简单  
入边数：86  
标签：JSON-校验、对象断言、公共基础  
所属文件：[packages/synthesis-contracts/src/common.ts](../../../../../files/packages/synthesis-contracts/src/common.ts.md)
源码：[packages/synthesis-contracts/src/common.ts:144](../../../../../../../packages/synthesis-contracts/src/common.ts#L144)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [librarySnapshot.ts](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:— | Zotero 文献库快照契约：定义快照请求、条目、完成证据与分页结果的 schema 常量、范围/顺序/批量上限，并提供对应的严格重建函数。 |
| [sidecarObservability.ts](../../../../../files/packages/synthesis-contracts/src/sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts:— | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [topicApplication.ts](../../../../../files/packages/synthesis-contracts/src/topicApplication.ts.md) | packages/synthesis-contracts/src/topicApplication.ts:— | 主题应用契约：apply / list / detail 请求重建，以及主题 ID 清洗、资产 ID 与 UTF-8 字节数等边界校验。 |
| [webDavSyncPort.ts](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:— | 宿主 WebDAV 端口契约：连接测试、远端描述、读写与 ensure-collection 的请求结果重建，含托管路径与 base URL 安全校验。 |
| [rebuildCreator](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:191–224 | 重建文献作者条目：姓名、姓氏与 ORCID 等标识。 |
| [rebuildZoteroLibrarySnapshotCompletionEvidence](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:354–405 | 重建快照完成证据：扫描范围、计数与哈希，界定一次快照的 basis。 |
| [rebuildZoteroLibrarySnapshotItem](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:261–352 | 重建单条快照条目：库键、标题、作者、日期、标签与集合归属。 |
| [rebuildZoteroLibrarySnapshotPage](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:407–502 | 重建快照分页结果，校验页元数据、条目数组与结束标记。 |
| [rebuildZoteroLibrarySnapshotRequest](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:226–259 | 重建文献库快照请求，校验 scope、order、批量与游标字段。 |
| [rebuildDescriptor](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:250–342 | 重建文献描述符：作者、年份、期刊、DOI 等规范字段。 |
| [rebuildItem](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:178–248 | 重建刷新条目：库键、标识、标题与版本哈希。 |
| [rebuildLiteratureQualitySnapshot](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:344–438 | 重建文献质量快照，校验评分、证据与产出哈希。 |
| [rebuildReadResult](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:539–621 | 重建读取结果，区分可用刷新数据与不可用原因。 |
| [rebuildScope](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:440–468 | 重建刷新范围定义，限定本次 prepare 覆盖的库与集合。 |
| [rebuildSynthesisReferenceRefreshApplyRequest](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:623–650 | 重建刷新 apply 请求，校验条目集合与 basis 哈希。 |
| [rebuildSynthesisReferenceRefreshInspectResult](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:673–725 | 重建刷新 inspect 结果，汇总范围统计与游标。 |
| [rebuildSynthesisReferenceRefreshMutationResult](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:741–793 | 重建刷新写操作结果与 durable 提交证据。 |
| [rebuildSynthesisReferenceRefreshPageRequest](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:652–671 | 重建刷新分页请求。 |
| [rebuildSynthesisReferenceRefreshPrepareRequest](../../../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts:470–537 | 重建刷新 prepare 请求，校验范围、批量与并发上限。 |
| [rebuildEffect](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:82–160 | 重建 related-items 单条 effect，校验动作、目标引用与载荷。 |
| [rebuildReceipt](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:187–229 | 重建 effect 执行 receipt，记录成功、跳过与失败原因。 |
| [rebuildSynthesisHostRelatedItemsEffectBatchRequest](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:162–185 | 重建 related-items 批次请求，限制批大小并逐条校验。 |
| [rebuildSynthesisHostRelatedItemsEffectBatchResult](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:231–273 | 重建批次结果，聚合 receipt、诊断与库键映射。 |
| [rebuildSynthesisHostRepresentativeImageReadRequest](../../../../../files/packages/synthesis-contracts/src/representativeImageRead.ts.md) | packages/synthesis-contracts/src/representativeImageRead.ts:223–240 | 重建代表图读取请求，校验条目键、候选与字节上限。 |
| [rebuildSynthesisHostRepresentativeImageReadResult](../../../../../files/packages/synthesis-contracts/src/representativeImageRead.ts.md) | packages/synthesis-contracts/src/representativeImageRead.ts:242–270 | 重建代表图读取顶层结果，收敛 available / unavailable 两态。 |
| [rebuildSynthesisTopicCanonicalStoreSnapshot](../../../../../files/packages/synthesis-contracts/src/sidecarCanonicalStore.ts.md) | packages/synthesis-contracts/src/sidecarCanonicalStore.ts:12–39 | 重建主题 canonical store 快照，校验版本、条目计数与内容哈希。 |
| [rebuildSynthesisSidecarDiscovery](../../../../../files/packages/synthesis-contracts/src/sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts:350–456 | 重建 sidecar 发现记录，校验端点、身份指纹与就绪时间。 |
| [rebuildSynthesisSidecarLaunchConfig](../../../../../files/packages/synthesis-contracts/src/sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts:171–348 | 重建 sidecar 启动配置，校验可执行文件绝对路径、平台目标与超时参数。 |
| [rebuildSynthesisSidecarObservationEvent](../../../../../files/packages/synthesis-contracts/src/sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts:194–320 | 重建 observation 事件，校验来源、边界、结局与 identity/metric/fact 键。 |
| [rebuildSynthesisSidecarTraceContext](../../../../../files/packages/synthesis-contracts/src/sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts:161–192 | 重建 trace context，校验 traceId、spanId 与父链路关系。 |
| [productionSnapshots](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:521–559 | 收敛生产运行时在各 owner 上的快照集合。 |
| [rebuildSynthesisProductionDiscovery](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:561–652 | 重建生产发现记录，包含端点、身份、能力与快照。 |
| [rebuildSynthesisProductionHandshakeResult](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:695–751 | 重建生产握手结果，校验协议版本、能力交集与身份匹配。 |
| [rebuildSynthesisProductionHealth](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:654–693 | 重建生产健康结果，区分存活、就绪与降级状态。 |
| [rebuildSynthesisReverseHostCall](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:1042–1106 | 重建 reverse-host 调用描述，绑定载荷、超时与 deadline。 |
| [rebuildSynthesisReverseHostPayload](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:753–918 | 重建 reverse-host 载荷，校验 capability、参数与体积上限。 |
| [rebuildSynthesisReverseHostResult](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:920–1040 | 重建 reverse-host 结果，区分成功、受限拒绝与传输失败。 |
| [rebuildSynthesisSidecarCallEnvelope](../../../../../files/packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts:806–854 | 重建 sidecar 调用 envelope，校验 capability、参数 schema 与幂等键。 |
| [rebuildSynthesisSidecarComputePoolSnapshot](../../../../../files/packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts:928–991 | 重建 compute pool 快照，校验 worker 数、队列深度与容量。 |
| [rebuildSynthesisSidecarHandshakeResult](../../../../../files/packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts:1188–1254 | 重建 sidecar 握手结果，校验协议版本与能力匹配。 |
| [rebuildSynthesisSidecarHealth](../../../../../files/packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts:1135–1186 | 重建 sidecar 健康结果，区分存活、就绪与不可用及稳定原因码。 |
| [rebuildSynthesisSidecarRepositorySnapshot](../../../../../files/packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts:993–1020 | 重建 repository 快照，校验 schema 版本、库路径与 owner 状态。 |
| [assetDescriptor](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:643–669 | 重建资产描述符，记录路径、大小与内容哈希。 |
| [execution](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1415–1455 | 收敛执行证据：执行 ID、模式与时间戳。 |
| [graphDiagnostics](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:563–606 | 重建图谱相关诊断，限制条数并保留稳定失败码。 |
| [inputHeader](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:608–622 | 重建传输输入页头，校验页序、来源与计数。 |
| [outputHeader](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:624–641 | 重建传输输出页头，校验页序、总量与校验和。 |
| [progress](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1385–1402 | 收敛传输进度字段：已完成、总量与单位。 |
| [rebuildAggregateEdge](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1096–1139 | 重建聚合边行，含成员集合、权重与角色证据。 |
| [rebuildGraphNode](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1025–1049 | 重建图谱节点行，含目标类型、角色与度量。 |
| [rebuildLibraryNode](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:930–953 | 重建库节点行：库键、标识与统计量。 |
| [rebuildLightMetric](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1164–1209 | 重建轻量指标行，记录度量名、值与统计窗口。 |
| [rebuildOwnership](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1141–1162 | 重建归属行：主体到资源的所有权证据。 |
| [rebuildReference](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:973–1023 | 重建参考文献行，含描述符、版本与证据。 |
| [rebuildResolvedEdge](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1051–1082 | 重建已解析边行，含两端节点、方向与解析依据。 |
| [rebuildRoleEvidence](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1084–1094 | 重建 RoleEvidence 契约对象，校验字段集合与边界后返回规范结构。 |
| [rebuildSynthesisSidecarOutputTransferReference](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1289–1302 | 重建输出传输引用，绑定 manifest 标识与页范围。 |
| [rebuildSynthesisSidecarTransferAction](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1324–1383 | 重建传输会话动作，区分提交、取消与继续。 |
| [rebuildSynthesisSidecarTransferManifest](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:714–928 | 重建传输 manifest，校验版本、页集合、资产与输入输出头。 |
| [rebuildSynthesisSidecarTransferPage](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1211–1287 | 重建传输页结果，校验页元数据、行数组与校验和。 |
| [rebuildSynthesisSidecarTransferPageDescriptor](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:683–712 | 重建传输分页描述符，校验页号、偏移与行数。 |
| [rebuildSynthesisSidecarTransferSnapshot](../sidecarTransfer.ts/rebuildSynthesisSidecarTransferSnapshot.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1510–1530 | 重建传输顶层快照，收敛 manifest、状态与输出引用。 |
| [rebuildSynthesisSidecarTransferStatus](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:1457–1508 | 重建传输状态快照，聚合进度、执行证据与诊断。 |
| [scope](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts:545–561 | 收敛传输 scope 定义，限定本次搬运覆盖的库与主题范围。 |
| [rebuildSynthesisHostStagedTagBindingResolutionRequest](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:106–138 | 重建 staged 标签绑定解析请求，校验批次与候选上限。 |
| [rebuildSynthesisHostStagedTagBindingResolutionResult](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:140–193 | 重建绑定解析结果，记录解析成功、歧义与未匹配项。 |
| [rebuildSynthesisHostTagEffectBatchRequest](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:274–292 | 重建标签 effect 批次请求，限制批大小并逐条校验。 |
| [rebuildSynthesisHostTagEffectBatchResult](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:339–366 | 重建标签批次结果，聚合 receipt 与诊断。 |
| [rebuildTagAuditStagingEntries](../../../../../files/packages/synthesis-contracts/src/tags.ts.md) | packages/synthesis-contracts/src/tags.ts:284–375 | 重建标签审计 staging 条目，校验批次、行数与字节上限。 |
| [rebuildTagRegulationVerifiedCommitDto](../../../../../files/packages/synthesis-contracts/src/tags.ts.md) | packages/synthesis-contracts/src/tags.ts:377–435 | 重建标签治理 verified commit 记录，绑定 basis 哈希与证据。 |
| [rebuildTagVocabularyRegulatorExportDto](../../../../../files/packages/synthesis-contracts/src/tags.ts.md) | packages/synthesis-contracts/src/tags.ts:55–83 | 重建词表 regulator 导出 DTO，供外部治理工具消费。 |
| [rebuildSynthesisTopicApplicationApplyRequest](../../../../../files/packages/synthesis-contracts/src/topicApplication.ts.md) | packages/synthesis-contracts/src/topicApplication.ts:201–267 | 重建主题 apply 请求，校验主题定义、资产引用与写入模式。 |
| [rebuildSynthesisTopicApplicationListRequest](../../../../../files/packages/synthesis-contracts/src/topicApplication.ts.md) | packages/synthesis-contracts/src/topicApplication.ts:269–298 | 重建主题列表请求，校验分页、排序与过滤条件。 |
| [exactObject](../../../../../files/packages/synthesis-contracts/src/topics.ts.md) | packages/synthesis-contracts/src/topics.ts:346–361 | 读取并校验普通对象的字段集合。 |
| [rebuildSynthesisHostWebDavSyncConnectionTest](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:157–241 | 重建连接测试结果，区分可达、鉴权失败与网络错误。 |
| [rebuildSynthesisHostWebDavSyncDescription](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:306–364 | 重建远端集合描述，聚合子集合与容量信息。 |
| [rebuildSynthesisHostWebDavSyncEnsureCollectionResult](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:479–505 | 重建集合确保结果，区分已存在与新建。 |
| [rebuildSynthesisHostWebDavSyncReadResult](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:374–418 | 重建远端读取结果，携带 ETag、内容与 not-found 语义。 |
| [rebuildSynthesisHostWebDavSyncWriteRequest](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:420–436 | 重建远端写入请求，校验目标路径、字节上限与条件写。 |
| [rebuildSynthesisHostWebDavSyncWriteResult](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:438–469 | 重建远端写入结果，记录 ETag 与冲突信号。 |
| [rebuildProgress](../../../../../files/packages/synthesis-contracts/src/workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts:1225–1269 | 重建进度投影，记录完成比例、阶段与剩余量。 |
| [strictObject](../../../../../files/packages/synthesis-contracts/src/workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts:1117–1133 | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 内部的 strictObject 处理逻辑。 |
| [rebuildSynthesisTopicPlanApplyRequest](../../../../../files/packages/synthesis-contracts/src/workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts:304–365 | 重建主题计划 apply 请求，校验动作集合、关系与幂等键。 |
| [rebuildSynthesisTopicPlanApplyResult](../../../../../files/packages/synthesis-contracts/src/workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts:367–472 | 重建主题计划 apply 结果，逐条返回执行结果与冲突信息。 |
| [rebuildTopicPlanAction](../../../../../files/packages/synthesis-contracts/src/workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts:192–253 | 重建主题计划动作，区分创建、更新与删除意图。 |
| [rebuildTopicPlanRelation](../../../../../files/packages/synthesis-contracts/src/workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts:255–302 | 重建主题计划中的关系条目，含关系类型与置信度。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [toSynthesisJsonValue](toSynthesisJsonValue.md) | packages/synthesis-contracts/src/common.ts:77–142 | 把任意运行时值收敛为合法 JSON 值：拒绝 undefined、函数、非有限数字与循环引用，并保留数组空位语义。 |
