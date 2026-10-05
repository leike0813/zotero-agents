
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/transfer.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/transfer.json -->

数据传输（transfer）语料，覆盖 citation 输入 manifest 与 topic 资产输出页的判别联合（discriminated union）形状，并以负例锁定未知字段与 page kind 行不匹配这两类错误边界。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/transfer.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/transfer.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [transfer.schema.json](../schemas/transfer.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/transfer.schema.json | 定义数据传输面协议的 JSON Schema，涵盖分页描述符（引用输入/输出、内容页）、库节点、引用行、图节点与解析边及归属信息。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-concept-topic-graph.json](client-concept-topic-graph.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-concept-topic-graph.json | 概念与主题图（concept/topic graph）方向的协议语料，约束 concept 查询请求与 topic-graph 变更请求的嵌套字段封闭性，并以负例锁定 concept match 与 topic graph diagnostic 的开放字段。 |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
