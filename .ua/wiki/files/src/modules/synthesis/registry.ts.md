
# src/modules/synthesis/registry.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/registry.ts -->

文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。
源码：[src/modules/synthesis/registry.ts](../../../../../../src/modules/synthesis/registry.ts)

## 符号（8）
<!-- node: function:src/modules/synthesis/registry.ts:artifactCoverageForArtifacts -->
<!-- node: function:src/modules/synthesis/registry.ts:buildFacet -->
<!-- node: function:src/modules/synthesis/registry.ts:buildReferenceSidecarIndexRow -->
<!-- node: function:src/modules/synthesis/registry.ts:buildReferenceSidecarIndexRows -->
<!-- node: function:src/modules/synthesis/registry.ts:buildReferenceSidecarMetadataFingerprintPayload -->
<!-- node: function:src/modules/synthesis/registry.ts:buildRegistryFacets -->
<!-- node: function:src/modules/synthesis/registry.ts:discoverArtifact -->
<!-- node: function:src/modules/synthesis/registry.ts:normalizeIsbnValues -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| artifactCoverageForArtifacts | 函数 | 348–358 | 简单 | 产物覆盖、判定、registry | 1 | 按已发现产物判定覆盖状态（完整、部分或缺失），供注册表分面与审阅诊断复用。 |
| buildFacet | 函数 | 367–377 | 简单 | 分面、统计、utility | 1 | 构造单个分面：把取值、状态与更新时间归并为可筛选的统计项。 |
| buildReferenceSidecarIndexRow | 函数 | 443–485 | 中等 | 索引行、投影、sidecar | 1 | 把一条文献输入投影为 sidecar 索引行，含指纹、产物覆盖与文献评分。 |
| buildReferenceSidecarIndexRows | 函数 | 487–503 | 简单 | 索引行、批处理、sidecar | 0 | 批量生成 sidecar 索引行并按稳定顺序排序，作为注册表快照输出。 |
| buildReferenceSidecarMetadataFingerprintPayload | 函数 | 209–234 | 中等 | 指纹、sidecar、索引 | 0 | 构造用于 sidecar 指纹的元数据载荷，只保留会影响索引结果的字段。 |
| buildRegistryFacets | 函数 | 388–441 | 中等 | 分面、统计、registry | 0 | 统计注册表分面：按产物状态、类型与更新时间聚合出可筛选的计数。 |
| discoverArtifact | 函数 | 290–346 | 中等 | 产物发现、managed-note、校验 | 1 | 从 managed note 中发现指定类型的产物，校验契约合法性并给出缺失或损坏状态。 |
| normalizeIsbnValues | 函数 | 177–198 | 简单 | 归一化、isbn、utility | 0 | 归一 ISBN 列表：去分隔符、去重并丢弃非法值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [foundation.ts](foundation.ts.md) | src/modules/synthesis/foundation.ts | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |
| [literatureArtifacts.ts](../../../packages/synthesis-contracts/src/literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |
| [literatureScore.ts](../../shared/literatureScore.ts.md) | src/shared/literatureScore.ts | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sourceReferenceArtifact.ts](../../../packages/synthesis-contracts/src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [libraryAdapter.ts](libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [zoteroReadonlyLibraryAdapter.ts](../harness/zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildReferenceSidecarIndexRow | 函数 | 443–485 | 把一条文献输入投影为 sidecar 索引行，含指纹、产物覆盖与文献评分。 |
| buildReferenceSidecarIndexRows | 函数 | 487–503 | 批量生成 sidecar 索引行并按稳定顺序排序，作为注册表快照输出。 |
| buildReferenceSidecarMetadataFingerprintPayload | 函数 | 209–234 | 构造用于 sidecar 指纹的元数据载荷，只保留会影响索引结果的字段。 |
| normalizeIsbnValues | 函数 | 177–198 | 归一 ISBN 列表：去分隔符、去重并丢弃非法值。 |
