
# assertSynthesisExactFields
<!-- node: function:packages/synthesis-contracts/src/common.ts:assertSynthesisExactFields -->

断言对象恰好包含必需字段且不含未知字段，是全部合约 DTO 拒绝多余字段的统一入口。
类型：函数  
复杂度：简单  
入边数：33  
标签：字段精确性、校验、公共基础、核心  
所属文件：[packages/synthesis-contracts/src/common.ts](../../../../../files/packages/synthesis-contracts/src/common.ts.md)
源码：[packages/synthesis-contracts/src/common.ts:163](../../../../../../../packages/synthesis-contracts/src/common.ts#L163)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [librarySnapshot.ts](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:— | Zotero 文献库快照契约：定义快照请求、条目、完成证据与分页结果的 schema 常量、范围/顺序/批量上限，并提供对应的严格重建函数。 |
| [webDavSyncPort.ts](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:— | 宿主 WebDAV 端口契约：连接测试、远端描述、读写与 ensure-collection 的请求结果重建，含托管路径与 base URL 安全校验。 |
| [rebuildSynthesisHostItemRef](../itemRef.ts/rebuildSynthesisHostItemRef.md) | packages/synthesis-contracts/src/itemRef.ts:18–42 | 重建 portable item ref：libraryId 必须为正安全整数，itemKey 须匹配字母数字并受长度上限约束。 |
| [rebuildCreator](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:191–224 | 重建文献作者条目：姓名、姓氏与 ORCID 等标识。 |
| [rebuildZoteroLibrarySnapshotCompletionEvidence](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:354–405 | 重建快照完成证据：扫描范围、计数与哈希，界定一次快照的 basis。 |
| [rebuildZoteroLibrarySnapshotItem](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:261–352 | 重建单条快照条目：库键、标题、作者、日期、标签与集合归属。 |
| [rebuildZoteroLibrarySnapshotPage](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:407–502 | 重建快照分页结果，校验页元数据、条目数组与结束标记。 |
| [rebuildZoteroLibrarySnapshotRequest](../../../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts:226–259 | 重建文献库快照请求，校验 scope、order、批量与游标字段。 |
| [rebuildEffect](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:82–160 | 重建 related-items 单条 effect，校验动作、目标引用与载荷。 |
| [rebuildReceipt](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:187–229 | 重建 effect 执行 receipt，记录成功、跳过与失败原因。 |
| [rebuildSynthesisHostRelatedItemsEffectBatchRequest](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:162–185 | 重建 related-items 批次请求，限制批大小并逐条校验。 |
| [rebuildSynthesisHostRelatedItemsEffectBatchResult](../../../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts:231–273 | 重建批次结果，聚合 receipt、诊断与库键映射。 |
| [rebuildAvailable](../../../../../files/packages/synthesis-contracts/src/representativeImageRead.ts.md) | packages/synthesis-contracts/src/representativeImageRead.ts:166–221 | 重建代表图可用结果，携带 MIME、大小、尺寸与 base64 内容。 |
| [rebuildSynthesisHostRepresentativeImageReadRequest](../../../../../files/packages/synthesis-contracts/src/representativeImageRead.ts.md) | packages/synthesis-contracts/src/representativeImageRead.ts:223–240 | 重建代表图读取请求，校验条目键、候选与字节上限。 |
| [rebuildSynthesisHostRepresentativeImageReadResult](../../../../../files/packages/synthesis-contracts/src/representativeImageRead.ts.md) | packages/synthesis-contracts/src/representativeImageRead.ts:242–270 | 重建代表图读取顶层结果，收敛 available / unavailable 两态。 |
| [rebuildUnavailable](../../../../../files/packages/synthesis-contracts/src/representativeImageRead.ts.md) | packages/synthesis-contracts/src/representativeImageRead.ts:141–164 | 重建代表图不可用结果，携带稳定原因码与诊断。 |
| [rebuildSynthesisHostStagedTagBindingResolutionRequest](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:106–138 | 重建 staged 标签绑定解析请求，校验批次与候选上限。 |
| [rebuildSynthesisHostStagedTagBindingResolutionResult](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:140–193 | 重建绑定解析结果，记录解析成功、歧义与未匹配项。 |
| [rebuildSynthesisHostTagEffectBatchRequest](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:274–292 | 重建标签 effect 批次请求，限制批大小并逐条校验。 |
| [rebuildSynthesisHostTagEffectBatchResult](../../../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts:339–366 | 重建标签批次结果，聚合 receipt 与诊断。 |
| [rebuildTagAuditStagingEntries](../../../../../files/packages/synthesis-contracts/src/tags.ts.md) | packages/synthesis-contracts/src/tags.ts:284–375 | 重建标签审计 staging 条目，校验批次、行数与字节上限。 |
| [rebuildTagRegulationVerifiedCommitDto](../../../../../files/packages/synthesis-contracts/src/tags.ts.md) | packages/synthesis-contracts/src/tags.ts:377–435 | 重建标签治理 verified commit 记录，绑定 basis 哈希与证据。 |
| [rebuildTagVocabularyRegulatorExportDto](../../../../../files/packages/synthesis-contracts/src/tags.ts.md) | packages/synthesis-contracts/src/tags.ts:55–83 | 重建词表 regulator 导出 DTO，供外部治理工具消费。 |
| [rebuildSynthesisHostWebDavSyncConnectionTest](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:157–241 | 重建连接测试结果，区分可达、鉴权失败与网络错误。 |
| [rebuildSynthesisHostWebDavSyncDescription](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:306–364 | 重建远端集合描述，聚合子集合与容量信息。 |
| [rebuildSynthesisHostWebDavSyncEnsureCollectionResult](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:479–505 | 重建集合确保结果，区分已存在与新建。 |
| [rebuildSynthesisHostWebDavSyncReadResult](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:374–418 | 重建远端读取结果，携带 ETag、内容与 not-found 语义。 |
| [rebuildSynthesisHostWebDavSyncWriteRequest](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:420–436 | 重建远端写入请求，校验目标路径、字节上限与条件写。 |
| [rebuildSynthesisHostWebDavSyncWriteResult](../../../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts:438–469 | 重建远端写入结果，记录 ETag 与冲突信号。 |
| [rebuildSynthesisTopicPlanApplyRequest](../../../../../files/packages/synthesis-contracts/src/workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts:304–365 | 重建主题计划 apply 请求，校验动作集合、关系与幂等键。 |
| [rebuildSynthesisTopicPlanApplyResult](../../../../../files/packages/synthesis-contracts/src/workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts:367–472 | 重建主题计划 apply 结果，逐条返回执行结果与冲突信息。 |
| [rebuildTopicPlanAction](../../../../../files/packages/synthesis-contracts/src/workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts:192–253 | 重建主题计划动作，区分创建、更新与删除意图。 |
| [rebuildTopicPlanRelation](../../../../../files/packages/synthesis-contracts/src/workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts:255–302 | 重建主题计划中的关系条目，含关系类型与置信度。 |

## 调用

该符号没有记录对外调用。
