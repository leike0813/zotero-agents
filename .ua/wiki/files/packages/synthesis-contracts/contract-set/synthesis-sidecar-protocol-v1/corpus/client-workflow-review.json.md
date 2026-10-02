
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-workflow-review.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-workflow-review.json -->

工作流审阅（workflow review）方向的协议语料，验证递归 review 结构与 review 请求字段，并以负例锁定嵌套开放字段与别名路径，防止客户端按宽松形状解析。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-workflow-review.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-workflow-review.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-workflow-review.schema.json](../schemas/client-workflow-review.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-workflow-review.schema.json | 定义工作流审阅客户端协议的 JSON Schema，约束审阅请求、结构化主题与时间线内容、注册表覆盖行以及缺失产物诊断。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-topic-workbench.json](client-topic-workbench.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-topic-workbench.json | Topic Workbench 工作台的协议语料主文件，收录 29 个用例，覆盖 chrome 请求、graph surface 请求、index/review registry 等工作台注册表结构，是本批中用例密度最高的契约基准。 |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
