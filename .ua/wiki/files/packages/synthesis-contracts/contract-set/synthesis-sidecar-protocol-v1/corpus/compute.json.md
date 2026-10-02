
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/compute.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/compute.json -->

计算能力（compute）方向的协议语料，覆盖 layout 请求与 metrics 结果的嵌套形状，并以 unknown-field 与 open diagnostics 负例约束结果的封闭性。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/compute.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/compute.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [compute.schema.json](../schemas/compute.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/compute.schema.json | 定义 sidecar 计算能力协议的 JSON Schema，涵盖引用图谱布局请求/结果（force、radial、component 参数）与度量请求/结果。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
