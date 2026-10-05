
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-tag.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-tag.json -->

标签（tag）方向的协议语料，覆盖 tag 保存请求与 tag 导入预览结果的嵌套结构，并以负例区分 legacy entry 与冲突项开放字段这两类历史兼容形态。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-tag.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-tag.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-tag.schema.json](../schemas/client-tag.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-tag.schema.json | 定义标签客户端协议的 JSON Schema，覆盖标签协议条目、标签清单与快照、保存请求、父级绑定以及校验警告。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
