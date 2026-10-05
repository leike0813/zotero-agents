
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-reference-canonical.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-reference-canonical.json -->

Reference 规范化事实方向的协议语料，约束 reference manual target 与 rank row 的嵌套结构，并以负例锁定 reference target 开放字段与 rank author type 的取值集合。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-reference-canonical.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-reference-canonical.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-reference-canonical.schema.json](../schemas/client-reference-canonical.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json | 定义 canonical Reference 客户端协议的 JSON Schema，约束文献索引请求与结果、排序请求以及刷新/匹配回执结构。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-citation-graph.json](client-citation-graph.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-citation-graph.json | 引用图谱（Citation Graph）方向的协议语料，覆盖 citation-graph 查询请求与 citation-metrics 计算结果的嵌套结构，并包含 snake_case 别名请求与通用 item 结果形态，锁定跨语言线缆字段命名。 |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
