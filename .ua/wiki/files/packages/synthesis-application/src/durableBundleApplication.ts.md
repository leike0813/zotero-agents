
# packages/synthesis-application/src/durableBundleApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/durableBundleApplication.ts -->

durable bundle（可持久化主题包）应用层：以 repository topic basis 校验既有草稿，驱动合约 codec 完成导出、导入事实分类与 apply，阻断 basis 漂移导致的覆盖。
源码：[packages/synthesis-application/src/durableBundleApplication.ts](../../../../../../packages/synthesis-application/src/durableBundleApplication.ts)

## 符号（3）
<!-- node: function:packages/synthesis-application/src/durableBundleApplication.ts:createSynthesisDurableBundleApplication -->
<!-- node: class:packages/synthesis-application/src/durableBundleApplication.ts:SynthesisDurableBundleApplicationError -->
<!-- node: function:packages/synthesis-application/src/durableBundleApplication.ts:verifiedFacts -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisDurableBundleApplication | 函数 | 186–527 | 复杂 | 工厂函数、durable-bundle、导入导出、核心 | 0 | durable bundle 应用工厂：提供草稿捕获、导出构建、导入预览与 apply、聚合 basis 校验等能力，导入前先按已验证事实分类条目。 |
| SynthesisDurableBundleApplicationError | 类 | 118–123 | 简单 | 错误类型、诊断、durable-bundle | 0 | durable bundle 应用层错误类型，携带错误码与诊断信息，用于 basis mismatch 与 codec 失败上报。 |
| verifiedFacts | 函数 | 146–175 | 中等 | 校验、导入、哈希核对 | 0 | 校验导入条目携带的事实（路径、大小、哈希）是否与远端快照一致，输出可安全 apply 的事实集合。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](../../synthesis-contracts/src/durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [durableBundleImport.ts](../../synthesis-contracts/src/durableBundleImport.ts.md) | packages/synthesis-contracts/src/durableBundleImport.ts | durable bundle 导入合约：构建同步索引，校验导入条目路径与载荷标量，规范化 live envelope 并把条目分类为可新增、可更新、可跳过三类事实。 |
| [topicCanonical.ts](topicCanonical.ts.md) | packages/synthesis-application/src/topicCanonical.ts | 主题 canonical store：定义主题目录的路径 ID、章节文件名与 JSON 文本规范，按 metadata envelope、章节身份与声明哈希重建快照并支持 inspect 诊断。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisDurableBundleApplication | 函数 | 186–527 | durable bundle 应用工厂：提供草稿捕获、导出构建、导入预览与 apply、聚合 basis 校验等能力，导入前先按已验证事实分类条目。 |
| SynthesisDurableBundleApplicationError | 类 | 118–123 | durable bundle 应用层错误类型，携带错误码与诊断信息，用于 basis mismatch 与 codec 失败上报。 |
