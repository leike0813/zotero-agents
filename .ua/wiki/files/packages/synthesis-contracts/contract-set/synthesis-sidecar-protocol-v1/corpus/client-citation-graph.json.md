
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-citation-graph.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-citation-graph.json -->

引用图谱（Citation Graph）方向的协议语料，覆盖 citation-graph 查询请求与 citation-metrics 计算结果的嵌套结构，并包含 snake_case 别名请求与通用 item 结果形态，锁定跨语言线缆字段命名。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-citation-graph.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-citation-graph.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-citation-graph.schema.json](../schemas/client-citation-graph.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-citation-graph.schema.json | 定义 Citation Graph 客户端查询协议的 JSON Schema，涵盖 basis 基础校验、图谱/切片查询、布局与度量读取以及更新命令。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [compute.json](compute.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/compute.json | 计算能力（compute）方向的协议语料，覆盖 layout 请求与 metrics 结果的嵌套形状，并以 unknown-field 与 open diagnostics 负例约束结果的封闭性。 |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
| [reverse-host.json](reverse-host.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json | 反向宿主（reverse-host）调用语料集，是本批唯一使用独立 schema 标识的语料文件，收录 10 个用例覆盖 related-items、tag effect、representative image、WebDAV description、artifact scan 与 delivery 等反向宿主结果形状。 |
