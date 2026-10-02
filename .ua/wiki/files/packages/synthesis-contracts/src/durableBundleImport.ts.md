
# packages/synthesis-contracts/src/durableBundleImport.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/durableBundleImport.ts -->

durable bundle 导入合约：构建同步索引，校验导入条目路径与载荷标量，规范化 live envelope 并把条目分类为可新增、可更新、可跳过三类事实。
源码：[packages/synthesis-contracts/src/durableBundleImport.ts](../../../../../../packages/synthesis-contracts/src/durableBundleImport.ts)

## 符号（6）
<!-- node: function:packages/synthesis-contracts/src/durableBundleImport.ts:classifySynthesisDurableImportFacts -->
<!-- node: function:packages/synthesis-contracts/src/durableBundleImport.ts:normalizeLiveEnvelope -->
<!-- node: function:packages/synthesis-contracts/src/durableBundleImport.ts:rebuildSynthesisDurableSyncIndex -->
<!-- node: function:packages/synthesis-contracts/src/durableBundleImport.ts:synthesisDurableEntityKey -->
<!-- node: function:packages/synthesis-contracts/src/durableBundleImport.ts:validateLivePayload -->
<!-- node: function:packages/synthesis-contracts/src/durableBundleImport.ts:validatePayloadScalars -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| classifySynthesisDurableImportFacts | 函数 | 516–567 | 复杂 | 事实分类、导入、冲突检测、durable-bundle、核心 | 0 | 把导入条目按与本地现状的比较结果分类为新增、更新、跳过与冲突四类事实，供预览与 apply 阶段分别处理。 |
| normalizeLiveEnvelope | 函数 | 441–495 | 复杂 | 规范化、导入、durable-bundle、核心 | 0 | 规范化 live envelope：按 schema 版本解码条目、补齐缺省字段并按实体键稳定排序。 |
| rebuildSynthesisDurableSyncIndex | 函数 | 159–219 | 复杂 | 同步索引、哈希、durable-bundle、核心 | 0 | 重建同步索引：为每个远端 bundle 条目计算实体键、路径、哈希与大小，作为本地比对的唯一依据。 |
| synthesisDurableEntityKey | 函数 | 139–144 | 简单 | 实体键、durable-bundle、纯函数 | 1 | 拼接实体种类、主题 ID 与实体 ID 组成全局唯一实体键，是导入去重与索引的主键来源。 |
| [validateLivePayload](../../../../symbols/packages/synthesis-contracts/src/durableBundleImport.ts/validateLivePayload.md) | 函数 | 382–439 | 复杂 | 校验、导入、durable-bundle、有界 | 1 | 校验 live envelope 内每个实体的载荷：字段精确性、标量类型、哈希形状与条目数量上限。 |
| validatePayloadScalars | 函数 | 355–380 | 中等 | 校验、标量、导入 | 1 | 校验载荷中的标量字段（哈希、路径、大小、版本）形状与取值范围，是完整载荷校验的第一道关。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundleApplication.ts](../../synthesis-application/src/durableBundleApplication.ts.md) | packages/synthesis-application/src/durableBundleApplication.ts | durable bundle（可持久化主题包）应用层：以 repository topic basis 校验既有草稿，驱动合约 codec 完成导出、导入事实分类与 apply，阻断 basis 漂移导致的覆盖。 |
| [durableBundleImport.ts](../../synthesis-repository/src/durableBundleImport.ts.md) | packages/synthesis-repository/src/durableBundleImport.ts | Durable bundle 导入仓储：按 sync index 与 commit receipt 校验导入事实，逐条 upsert 领域对象并更新各领域 basis，完成 durable 状态导入。 |
| [webDavSync.ts](webDavSync.ts.md) | packages/synthesis-contracts/src/webDavSync.ts | WebDAV 同步状态契约：sync head/state/conflict 的 schema ID 与版本、诊断与冲突报告重建、远端快照指针与路径生成。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| classifySynthesisDurableImportFacts | 函数 | 516–567 | 把导入条目按与本地现状的比较结果分类为新增、更新、跳过与冲突四类事实，供预览与 apply 阶段分别处理。 |
| normalizeLiveEnvelope | 函数 | 441–495 | 规范化 live envelope：按 schema 版本解码条目、补齐缺省字段并按实体键稳定排序。 |
| rebuildSynthesisDurableSyncIndex | 函数 | 159–219 | 重建同步索引：为每个远端 bundle 条目计算实体键、路径、哈希与大小，作为本地比对的唯一依据。 |
| synthesisDurableEntityKey | 函数 | 139–144 | 拼接实体种类、主题 ID 与实体 ID 组成全局唯一实体键，是导入去重与索引的主键来源。 |
| [validateLivePayload](../../../../symbols/packages/synthesis-contracts/src/durableBundleImport.ts/validateLivePayload.md) | 函数 | 382–439 | 校验 live envelope 内每个实体的载荷：字段精确性、标量类型、哈希形状与条目数量上限。 |
