
# packages/synthesis-contracts/src/literatureArtifacts.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/literatureArtifacts.ts -->

定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。
源码：[packages/synthesis-contracts/src/literatureArtifacts.ts](../../../../../../packages/synthesis-contracts/src/literatureArtifacts.ts)

## 符号（2）
<!-- node: function:packages/synthesis-contracts/src/literatureArtifacts.ts:parseLiteratureScoreArtifact -->
<!-- node: function:packages/synthesis-contracts/src/literatureArtifacts.ts:validateLiteratureScoreArtifact -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| parseLiteratureScoreArtifact | 函数 | 144–152 | 简单 | 解析、合约、artifact | 0 | 解析并返回通过校验的 literature score artifact 对象，校验失败时抛出类型化错误。 |
| validateLiteratureScoreArtifact | 函数 | 128–142 | 简单 | 校验、合约、artifact | 0 | 校验 literature score artifact 的 payload 类型、schema 引用与必填字段，返回结构化问题列表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literature-score-artifact.schema.json](../contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json.md) | packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json | canonical literature artifacts v1 契约集中文献评分产物（literature_score.v1）的 JSON Schema，约束 rubric_id、paper_type 枚举、overall_score/confidence/confidence_adjusted_score 取值范围，以及固定 6 个维度的 Dimension、criteria 明细 Criterion 与带行号引文的 Evidence 子结构。 |
| [sourceReferenceArtifact.ts](sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostRead.ts](hostRead.ts.md) | packages/synthesis-contracts/src/hostRead.ts | 宿主只读合约：定义文献条目分页、按 ref 批量读取、artifact 扫描与就绪度查询、artifact 读取的分页请求与结果重建，以及文献质量评估。 |
| [literatureScore.ts](../../../src/shared/literatureScore.ts.md) | src/shared/literatureScore.ts | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [referenceRefreshApplication.ts](referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts | 参考文献刷新应用契约：prepare/apply/page 请求，以及条目、描述符与文献质量快照的严格重建。 |
| [registry.ts](../../../src/modules/synthesis/registry.ts.md) | src/modules/synthesis/registry.ts | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |
| [types.ts](../../../src/workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |
| [zoteroHostCapabilityBroker.ts](../../../src/modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroManagedNotes.ts](../../../src/modules/zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| parseLiteratureScoreArtifact | 函数 | 144–152 | 解析并返回通过校验的 literature score artifact 对象，校验失败时抛出类型化错误。 |
| validateLiteratureScoreArtifact | 函数 | 128–142 | 校验 literature score artifact 的 payload 类型、schema 引用与必填字段，返回结构化问题列表。 |
