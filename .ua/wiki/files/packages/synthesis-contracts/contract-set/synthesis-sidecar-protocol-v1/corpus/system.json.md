
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/system.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/system.json -->

系统面协议语料，覆盖 workbench operational chrome 结果、canonical inspect 结果、死状态载荷与通用 job 进度事件，锁定系统级快照与进度通知的线缆形状。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/system.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/system.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [system.schema.json](../schemas/system.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/system.schema.json | 定义 system 能力协议的 JSON Schema，包含握手请求/结果、健康检查、关闭请求、能力描述与仓库/计算池/传输快照。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
