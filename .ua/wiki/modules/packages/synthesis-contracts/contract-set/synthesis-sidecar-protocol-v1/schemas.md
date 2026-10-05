
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas
> 目录聚合页：18 个文件、0 个符号。由知识图谱按源路径生成。

语言：json

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-artifact-library-debug.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-artifact-library-debug.schema.json.md) | 配置 | 0 | 定义 Artifact Library 客户端读取与调试快照的 JSON Schema，约束产物筛选、分页调试视图、导出状态以及文献质量与作者等字段。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-citation-graph.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-citation-graph.schema.json.md) | 配置 | 0 | 定义 Citation Graph 客户端查询协议的 JSON Schema，涵盖 basis 基础校验、图谱/切片查询、布局与度量读取以及更新命令。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-concept-topic-graph.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-concept-topic-graph.schema.json.md) | 配置 | 0 | 定义概念知识库与主题图谱客户端协议的 JSON Schema，包含概念查询、概念知识库查询、主题图谱变更结果与索引重建请求。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json.md) | 配置 | 0 | 定义 canonical Reference 客户端协议的 JSON Schema，约束文献索引请求与结果、排序请求以及刷新/匹配回执结构。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-tag.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-tag.schema.json.md) | 配置 | 0 | 定义标签客户端协议的 JSON Schema，覆盖标签协议条目、标签清单与快照、保存请求、父级绑定以及校验警告。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json.md) | 配置 | 0 | 定义 Topic Workbench 客户端 surface 协议的 JSON Schema，是本协议集中最大的 DTO 契约，约束主题记录、列表分页结果、主题上下文与更新意图。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json.md) | 配置 | 0 | 定义 WebDAV 维护客户端协议的 JSON Schema，包含连接测试与诊断、冲突报告条目、同步状态、进度与上次运行记录。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-workflow-review.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-workflow-review.schema.json.md) | 配置 | 0 | 定义工作流审阅客户端协议的 JSON Schema，约束审阅请求、结构化主题与时间线内容、注册表覆盖行以及缺失产物诊断。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json.md) | 配置 | 0 | 协议集共用基础 JSON Schema，提供 identifier、sha256、sidecarError、opaqueCanonicalJson 与 canonicalTextChunk 等跨域通用定义。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/compute.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/compute.schema.json.md) | 配置 | 0 | 定义 sidecar 计算能力协议的 JSON Schema，涵盖引用图谱布局请求/结果（force、radial、component 参数）与度量请求/结果。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json.md) | 配置 | 0 | 定义 sidecar 生命周期协议的 JSON Schema，包含启动配置 v4、发现文档 v2/生产发现 v5、平台签名与反向宿主描述。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/observability.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/observability.schema.json.md) | 配置 | 0 | 定义可观测性协议的 JSON Schema，统一 trace 上下文、身份、指标与事实字段，承载 sidecar 运行时观测事件。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json.md) | 配置 | 0 | 定义 sidecar 反向调用 Zotero 宿主能力的通道协议 JSON Schema，包含库条目引用、库快照请求/引用/标识与结构化诊断。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/runtime-bundle.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/runtime-bundle.schema.json.md) | 配置 | 0 | 定义运行时 bundle 协议的 JSON Schema，描述 bundle v3、指针 v2、相对路径文件条目与来源证明（Provenance）。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/system.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/system.schema.json.md) | 配置 | 0 | 定义 system 能力协议的 JSON Schema，包含握手请求/结果、健康检查、关闭请求、能力描述与仓库/计算池/传输快照。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json.md) | 配置 | 0 | 定义 topic domain 领域模型的 JSON Schema，是主题、解析器、摘要引用、已解析文献与产物元数据等领域实体的公共结构来源。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/transfer.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/transfer.schema.json.md) | 配置 | 0 | 定义数据传输面协议的 JSON Schema，涵盖分页描述符（引用输入/输出、内容页）、库节点、引用行、图节点与解析边及归属信息。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/worker.schema.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/worker.schema.json.md) | 配置 | 0 | 定义 worker 作业协议的 JSON Schema，涵盖标签条目与标签协议、标签词表校验的运行头/输入段/结果头等作业消息结构。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../../src.md) | 18 |
