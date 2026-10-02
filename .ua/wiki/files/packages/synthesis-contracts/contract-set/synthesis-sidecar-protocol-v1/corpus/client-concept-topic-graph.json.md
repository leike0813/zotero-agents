
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-concept-topic-graph.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-concept-topic-graph.json -->

概念与主题图（concept/topic graph）方向的协议语料，约束 concept 查询请求与 topic-graph 变更请求的嵌套字段封闭性，并以负例锁定 concept match 与 topic graph diagnostic 的开放字段。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-concept-topic-graph.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-concept-topic-graph.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-concept-topic-graph.schema.json](../schemas/client-concept-topic-graph.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-concept-topic-graph.schema.json | 定义概念知识库与主题图谱客户端协议的 JSON Schema，包含概念查询、概念知识库查询、主题图谱变更结果与索引重建请求。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-topic-workbench.json](client-topic-workbench.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-topic-workbench.json | Topic Workbench 工作台的协议语料主文件，收录 29 个用例，覆盖 chrome 请求、graph surface 请求、index/review registry 等工作台注册表结构，是本批中用例密度最高的契约基准。 |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
