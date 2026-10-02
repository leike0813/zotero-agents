
# scripts/synthesis/synthesisProductionSurfaceCorpora.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/synthesisProductionSurfaceCorpora.ts -->

生产 surface 语料库：定义各 surface 的 schema、codec、基线 fixture、请求/响应字节边界与 operation 清单，并读取基线证据用于一致性检查。
源码：[scripts/synthesis/synthesisProductionSurfaceCorpora.ts](../../../../../scripts/synthesis/synthesisProductionSurfaceCorpora.ts)

## 符号（3）
<!-- node: function:scripts/synthesis/synthesisProductionSurfaceCorpora.ts:inspectSynthesisProductionBaselineEvidence -->
<!-- node: function:scripts/synthesis/synthesisProductionSurfaceCorpora.ts:readSynthesisProductionBaselineFixture -->
<!-- node: function:scripts/synthesis/synthesisProductionSurfaceCorpora.ts:synthesisProductionSurfaceOperationFingerprint -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| inspectSynthesisProductionBaselineEvidence | 函数 | 171–295 | 中等 | test、baseline、validation | 0 | 检查基线证据是否覆盖全部 surface 与 operation，缺失时返回结构化差异。 |
| readSynthesisProductionBaselineFixture | 函数 | 160–169 | 简单 | fixture、baseline、io | 0 | 读取生产基线 fixture 文件，解析为结构化基线证据。 |
| synthesisProductionSurfaceOperationFingerprint | 函数 | 138–149 | 简单 | hashing、contracts、corpora | 0 | 为生产 surface 的单个 operation 计算稳定指纹，用于跨侧比对。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-artifact-library-debug-surface-parity.ts](check-synthesis-artifact-library-debug-surface-parity.ts.md) | scripts/synthesis/check-synthesis-artifact-library-debug-surface-parity.ts | 产物库 debug surface 一致性检查：比对 production surface 语料与 sidecar system 契约，确认 debug 面板所需的每个 operation 都被声明。 |
| [check-synthesis-citation-graph-surface-parity.ts](check-synthesis-citation-graph-surface-parity.ts.md) | scripts/synthesis/check-synthesis-citation-graph-surface-parity.ts | 引用图谱 surface 一致性检查：校验引用图谱相关 operation 在契约、语料与基线 fixture 三侧齐备。 |
| [check-synthesis-concept-topic-graph-surface-parity.ts](check-synthesis-concept-topic-graph-surface-parity.ts.md) | scripts/synthesis/check-synthesis-concept-topic-graph-surface-parity.ts | 概念-主题图谱 surface 一致性检查：校验概念知识库与主题关系图谱 operation 的跨语言契约覆盖情况。 |
| [check-synthesis-production-capabilities.ts](check-synthesis-production-capabilities.ts.md) | scripts/synthesis/check-synthesis-production-capabilities.ts | 生产 capability 契约检查：验证 sidecar system 声明的 capability 集合、operation policy、语义成功规则与 CLI 暴露面一致。 |
| [check-synthesis-reference-canonical-surface-parity.ts](check-synthesis-reference-canonical-surface-parity.ts.md) | scripts/synthesis/check-synthesis-reference-canonical-surface-parity.ts | canonical reference surface 一致性检查：校验引用 canonical 化相关 operation 在契约与语料侧的覆盖与边界。 |
| [check-synthesis-tag-surface-parity.ts](check-synthesis-tag-surface-parity.ts.md) | scripts/synthesis/check-synthesis-tag-surface-parity.ts | 标签 surface 一致性检查：校验标签词表相关 operation 的契约、语料与基线一致。 |
| [check-synthesis-topic-workbench-surface-parity.ts](check-synthesis-topic-workbench-surface-parity.ts.md) | scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts | 主题工作台 surface 一致性检查：校验 workbench 消费的 operation 集合与 sidecar 契约声明齐备。 |
| [check-synthesis-webdav-maintenance-surface-parity.ts](check-synthesis-webdav-maintenance-surface-parity.ts.md) | scripts/synthesis/check-synthesis-webdav-maintenance-surface-parity.ts | WebDAV 维护 surface 一致性检查：校验 public maintenance operation 的 capability、路由与语料声明一致。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| inspectSynthesisProductionBaselineEvidence | 函数 | 171–295 | 检查基线证据是否覆盖全部 surface 与 operation，缺失时返回结构化差异。 |
| readSynthesisProductionBaselineFixture | 函数 | 160–169 | 读取生产基线 fixture 文件，解析为结构化基线证据。 |
| synthesisProductionSurfaceOperationFingerprint | 函数 | 138–149 | 为生产 surface 的单个 operation 计算稳定指纹，用于跨侧比对。 |
