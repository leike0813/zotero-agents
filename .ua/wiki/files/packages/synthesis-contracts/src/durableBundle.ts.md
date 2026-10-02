
# packages/synthesis-contracts/src/durableBundle.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/durableBundle.ts -->

durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。
源码：[packages/synthesis-contracts/src/durableBundle.ts](../../../../../../packages/synthesis-contracts/src/durableBundle.ts)

## 符号（5）
<!-- node: function:packages/synthesis-contracts/src/durableBundle.ts:bundleKindFor -->
<!-- node: function:packages/synthesis-contracts/src/durableBundle.ts:createSynthesisDurableBundleCodec -->
<!-- node: function:packages/synthesis-contracts/src/durableBundle.ts:defaultValidatePath -->
<!-- node: class:packages/synthesis-contracts/src/durableBundle.ts:SynthesisDurableBundleContractError -->
<!-- node: function:packages/synthesis-contracts/src/durableBundle.ts:topicIdFor -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bundleKindFor | 函数 | 350–369 | 简单 | 映射、实体种类、durable-bundle | 1 | 由实体种类推导 bundle kind 映射，未知实体种类立即以合约错误拒绝。 |
| createSynthesisDurableBundleCodec | 函数 | 386–1060 | 复杂 | 工厂函数、codec、durable-bundle、核心、编解码 | 0 | durable bundle codec 工厂：封装草稿到 bundle、bundle 到导出件的编解码、路径安全校验、实体键推导与各类实体的写入/读取。 |
| defaultValidatePath | 函数 | 331–344 | 简单 | 路径安全、校验、durable-bundle | 1 | 默认路径校验：拒绝绝对路径、.. 上跳与反斜杠，确保 bundle 内路径始终落在主题目录之下。 |
| SynthesisDurableBundleContractError | 类 | 188–199 | 简单 | 错误类型、合约、durable-bundle | 0 | durable bundle 合约错误类型，携带字段定位与原因码，覆盖 manifest、asset 与 bundle 三层校验失败。 |
| topicIdFor | 函数 | 371–384 | 简单 | 主题、校验、durable-bundle | 0 | 从 bundle 条目中提取所属主题 ID，并校验其字符集与长度上限。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptKbApplication.ts](conceptKbApplication.ts.md) | packages/synthesis-contracts/src/conceptKbApplication.ts | 概念知识库应用层合约（1155 行，全批最大合约文件）：逐字段重建概念、义项、别名、关系、proposal、审阅项与主题链接，并定义 replace/ingest/review/delete/query 等请求与 mutation 结果。 |
| [referenceMatchingReviewApplication.ts](referenceMatchingReviewApplication.ts.md) | packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts | 参考文献匹配审阅应用契约：prepare/apply/discard 请求、匹配提案与审阅决策 DTO、提案分页以及带图谱增量的 mutation 结果重建。 |
| [referenceRefreshApplication.ts](referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts | 参考文献刷新应用契约：prepare/apply/page 请求，以及条目、描述符与文献质量快照的严格重建。 |
| [tagVocabularyApplication.ts](tagVocabularyApplication.ts.md) | packages/synthesis-contracts/src/tagVocabularyApplication.ts | 标签词表应用契约：候选、保存、分页、staging、条目更新删除、索引重建与审计替换清空的完整请求/结果 DTO 集合。 |
| [topicApplication.ts](topicApplication.ts.md) | packages/synthesis-contracts/src/topicApplication.ts | 主题应用契约：apply / list / detail 请求重建，以及主题 ID 清洗、资产 ID 与 UTF-8 字节数等边界校验。 |
| [topicGraphApplication.ts](topicGraphApplication.ts.md) | packages/synthesis-contracts/src/topicGraphApplication.ts | 主题图谱应用契约：快照、replace/upsert/ingest/物化主题、关系裁决、审阅、标记删除与索引重建请求及 mutation 结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](../../synthesis-repository/src/durableBundle.ts.md) | packages/synthesis-repository/src/durableBundle.ts | Durable bundle 仓储：把仓储层的引用、审阅、主题 basis 与草稿事实投影为可导出的 durable bundle 仓储状态。 |
| [durableBundleApplication.ts](../../synthesis-application/src/durableBundleApplication.ts.md) | packages/synthesis-application/src/durableBundleApplication.ts | durable bundle（可持久化主题包）应用层：以 repository topic basis 校验既有草稿，驱动合约 codec 完成导出、导入事实分类与 apply，阻断 basis 漂移导致的覆盖。 |
| [durableBundleImport.ts](../../synthesis-repository/src/durableBundleImport.ts.md) | packages/synthesis-repository/src/durableBundleImport.ts | Durable bundle 导入仓储：按 sync index 与 commit receipt 校验导入事实，逐条 upsert 领域对象并更新各领域 basis，完成 durable 状态导入。 |
| [durableBundleImport.ts](durableBundleImport.ts.md) | packages/synthesis-contracts/src/durableBundleImport.ts | durable bundle 导入合约：构建同步索引，校验导入条目路径与载荷标量，规范化 live envelope 并把条目分类为可新增、可更新、可跳过三类事实。 |
| [webDavSync.ts](webDavSync.ts.md) | packages/synthesis-contracts/src/webDavSync.ts | WebDAV 同步状态契约：sync head/state/conflict 的 schema ID 与版本、诊断与冲突报告重建、远端快照指针与路径生成。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisDurableBundleCodec | 函数 | 386–1060 | durable bundle codec 工厂：封装草稿到 bundle、bundle 到导出件的编解码、路径安全校验、实体键推导与各类实体的写入/读取。 |
| SynthesisDurableBundleContractError | 类 | 188–199 | durable bundle 合约错误类型，携带字段定位与原因码，覆盖 manifest、asset 与 bundle 三层校验失败。 |
