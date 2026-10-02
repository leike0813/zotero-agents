
# src/shared/literatureScore.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/literatureScore.ts -->

文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。

规模：153 行
源码：[src/shared/literatureScore.ts](../../../../../src/shared/literatureScore.ts)

## 符号（5）
<!-- node: function:src/shared/literatureScore.ts:buildLiteratureQualitySnapshot -->
<!-- node: function:src/shared/literatureScore.ts:literatureQualityPrior -->
<!-- node: function:src/shared/literatureScore.ts:literatureScoreToStars -->
<!-- node: function:src/shared/literatureScore.ts:parseLiteratureScore -->
<!-- node: function:src/shared/literatureScore.ts:parseStoredLiteratureScoreArtifact -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildLiteratureQualitySnapshot | 函数 | 104–141 | 简单 | literature-score、snapshot、aggregation | 0 | 汇总各维度分数、置信度与诊断，生成文献质量快照。 |
| literatureQualityPrior | 函数 | 93–102 | 简单 | literature-score、ranking、projection | 0 | 由评分摘要推导文献质量先验，作为综合排序的输入。 |
| literatureScoreToStars | 函数 | 143–153 | 简单 | literature-score、presentation、utility | 1 | 把总体分映射为展示用星级。 |
| [parseLiteratureScore](../../../symbols/src/shared/literatureScore.ts/parseLiteratureScore.md) | 函数 | 70–91 | 简单 | literature-score、parsing、validation | 2 | 校验并解析评分 payload 为结构化分数摘要。 |
| parseStoredLiteratureScoreArtifact | 函数 | 42–68 | 简单 | literature-score、parsing、artifact | 0 | 解析已存入笔记的文献评分产物，失败时返回可诊断的 null 而不抛出。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureArtifacts.ts](../../packages/synthesis-contracts/src/literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [libraryAdapter.ts](../modules/synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [libraryArtifactReadiness.ts](../modules/zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [libraryArtifactsColumn.ts](../modules/libraryArtifactsColumn.ts.md) | src/modules/libraryArtifactsColumn.ts | 为 Zotero 文献库列表注册「文献产物」与「文献评分」两个虚拟列，负责单元格数据供给、渲染、缓存与防抖刷新。 |
| [registry.ts](../modules/synthesis/registry.ts.md) | src/modules/synthesis/registry.ts | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |
| [RegistryTables.tsx](../synthesis/components/registry/RegistryTables.tsx.md) | src/synthesis/components/registry/RegistryTables.tsx | 注册表表格渲染层：包含索引表与“仅被引用条目”两张表的行、标题、状态、评分、父级展开与行内动作渲染。 |
| [zoteroManagedNotes.ts](../modules/zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |
| [zoteroReadonlyLibraryAdapter.ts](../modules/harness/zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildLiteratureQualitySnapshot | 函数 | 104–141 | 汇总各维度分数、置信度与诊断，生成文献质量快照。 |
| literatureQualityPrior | 函数 | 93–102 | 由评分摘要推导文献质量先验，作为综合排序的输入。 |
| literatureScoreToStars | 函数 | 143–153 | 把总体分映射为展示用星级。 |
| [parseLiteratureScore](../../../symbols/src/shared/literatureScore.ts/parseLiteratureScore.md) | 函数 | 70–91 | 校验并解析评分 payload 为结构化分数摘要。 |
| parseStoredLiteratureScoreArtifact | 函数 | 42–68 | 解析已存入笔记的文献评分产物，失败时返回可诊断的 null 而不抛出。 |
