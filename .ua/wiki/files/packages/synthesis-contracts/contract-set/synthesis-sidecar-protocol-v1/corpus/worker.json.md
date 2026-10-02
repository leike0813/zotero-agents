
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/worker.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/worker.json -->

Sidecar worker 语料集（独立 schema 标识），覆盖 worker tag entry 与 concept alias 的嵌套正例，并以未知嵌套字段与错误嵌套两类负例锁定 worker 层解析边界。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/worker.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/worker.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [worker.schema.json](../schemas/worker.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/worker.schema.json | 定义 worker 作业协议的 JSON Schema，涵盖标签条目与标签协议、标签词表校验的运行头/输入段/结果头等作业消息结构。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-tag.json](client-tag.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-tag.json | 标签（tag）方向的协议语料，覆盖 tag 保存请求与 tag 导入预览结果的嵌套结构，并以负例区分 legacy entry 与冲突项开放字段这两类历史兼容形态。 |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
