
# packages/synthesis-contracts/src/canonicalJson.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/canonicalJson.ts -->

canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。
源码：[packages/synthesis-contracts/src/canonicalJson.ts](../../../../../../packages/synthesis-contracts/src/canonicalJson.ts)

## 符号（6）
<!-- node: function:packages/synthesis-contracts/src/canonicalJson.ts:canonicalizeSynthesisContractJsonArtifact -->
<!-- node: function:packages/synthesis-contracts/src/canonicalJson.ts:countSynthesisContractJsonNodes -->
<!-- node: function:packages/synthesis-contracts/src/canonicalJson.ts:normalizeJson -->
<!-- node: function:packages/synthesis-contracts/src/canonicalJson.ts:sha256Hex -->
<!-- node: class:packages/synthesis-contracts/src/canonicalJson.ts:SynthesisCanonicalJsonError -->
<!-- node: function:packages/synthesis-contracts/src/canonicalJson.ts:utf8BytesUnchecked -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| canonicalizeSynthesisContractJsonArtifact | 函数 | 270–281 | 简单 | canonical-json、artifact、合约 | 0 | 产出规范化 artifact：同时给出 canonical 文本、哈希与节点数，供合约层直接消费。 |
| countSynthesisContractJsonNodes | 函数 | 283–298 | 简单 | 有界、统计、canonical-json | 0 | 统计规范化 JSON 的节点总数并施加上限，用于阻止超大载荷拖垮哈希计算。 |
| [normalizeJson](../../../../symbols/packages/synthesis-contracts/src/canonicalJson.ts/normalizeJson.md) | 函数 | 201–254 | 复杂 | canonical-json、规范化、核心、递归 | 1 | 递归规范化 JSON 值：对象键按 UTF-8 字节序排序、拒绝非有限数字与孤立代理项、统计节点数并限制深度。 |
| sha256Hex | 函数 | 108–184 | 复杂 | sha256、实现、基础库、核心 | 0 | 纯 TypeScript 实现的 SHA-256，将字节输入压成十六进制摘要，不依赖任何运行时 crypto。 |
| SynthesisCanonicalJsonError | 类 | 20–30 | 简单 | 错误类型、canonical-json、诊断 | 0 | canonical JSON 合约错误类型，携带错误码与 JSON 定位路径，用于非法值、孤立代理项与超限诊断。 |
| utf8BytesUnchecked | 函数 | 69–93 | 中等 | utf8、编码、基础库 | 1 | 把字符串逐字符编码为 UTF-8 字节序列，处理代理对与孤立代理项两种情况。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-cross-language-contracts.ts](../../../scripts/synthesis/check-synthesis-cross-language-contracts.ts.md) | scripts/synthesis/check-synthesis-cross-language-contracts.ts | 跨语言契约检查脚本：递归比对 TS 契约 schema 与 Rust 侧协议注册表，验证结构、协议引用与必填字段在两种语言实现中保持一致。 |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [conceptKbIndex.ts](../../synthesis-engine/src/conceptKbIndex.ts.md) | packages/synthesis-engine/src/conceptKbIndex.ts | Synthesis 概念知识库索引引擎：把概念、义项、别名、来源等 canonical 行编译为可 checkpoint 的索引与查询结果，并提供进程内引擎工厂。 |
| [referenceProjection.ts](../../synthesis-application/src/referenceProjection.ts.md) | packages/synthesis-application/src/referenceProjection.ts | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |
| [sidecarRuntimeBundle.ts](sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarRuntimeRelease.ts](sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |
| [sourceReferenceArtifact.ts](sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [synthesisSidecarTransferClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts | sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。 |
| [tags.ts](tags.ts.md) | packages/synthesis-contracts/src/tags.ts | 标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。 |
| [tagVocabulary.ts](../../synthesis-engine/src/tagVocabulary.ts.md) | packages/synthesis-engine/src/tagVocabulary.ts | 标签词表引擎：校验 canonical 标签、别名与缩写并计算标签索引结果，输出可被引用与主题图谱消费的词表事实。 |
| [topicGraphIndex.ts](../../synthesis-engine/src/topicGraphIndex.ts.md) | packages/synthesis-engine/src/topicGraphIndex.ts | 主题关系图索引引擎：把主题节点与边编译为有界索引结果，支持分批 checkpoint，控制节点数、边数与字符串长度上限。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| canonicalizeSynthesisContractJsonArtifact | 函数 | 270–281 | 产出规范化 artifact：同时给出 canonical 文本、哈希与节点数，供合约层直接消费。 |
| countSynthesisContractJsonNodes | 函数 | 283–298 | 统计规范化 JSON 的节点总数并施加上限，用于阻止超大载荷拖垮哈希计算。 |
| [normalizeJson](../../../../symbols/packages/synthesis-contracts/src/canonicalJson.ts/normalizeJson.md) | 函数 | 201–254 | 递归规范化 JSON 值：对象键按 UTF-8 字节序排序、拒绝非有限数字与孤立代理项、统计节点数并限制深度。 |
| sha256Hex | 函数 | 108–184 | 纯 TypeScript 实现的 SHA-256，将字节输入压成十六进制摘要，不依赖任何运行时 crypto。 |
| SynthesisCanonicalJsonError | 类 | 20–30 | canonical JSON 合约错误类型，携带错误码与 JSON 定位路径，用于非法值、孤立代理项与超限诊断。 |
