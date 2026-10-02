
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-topic-workbench.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-topic-workbench.json -->

Topic Workbench 工作台的协议语料主文件，收录 29 个用例，覆盖 chrome 请求、graph surface 请求、index/review registry 等工作台注册表结构，是本批中用例密度最高的契约基准。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-topic-workbench.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-topic-workbench.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-topic-workbench.schema.json](../schemas/client-topic-workbench.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json | 定义 Topic Workbench 客户端 surface 协议的 JSON Schema，是本协议集中最大的 DTO 契约，约束主题记录、列表分页结果、主题上下文与更新意图。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [compute.json](compute.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/compute.json | 计算能力（compute）方向的协议语料，覆盖 layout 请求与 metrics 结果的嵌套形状，并以 unknown-field 与 open diagnostics 负例约束结果的封闭性。 |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
| [system.json](system.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/system.json | 系统面协议语料，覆盖 workbench operational chrome 结果、canonical inspect 结果、死状态载荷与通用 job 进度事件，锁定系统级快照与进度通知的线缆形状。 |
