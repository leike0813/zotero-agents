
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json -->

反向宿主（reverse-host）调用语料集，是本批唯一使用独立 schema 标识的语料文件，收录 10 个用例覆盖 related-items、tag effect、representative image、WebDAV description、artifact scan 与 delivery 等反向宿主结果形状。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [reverse-host.schema.json](../schemas/reverse-host.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json | 定义 sidecar 反向调用 Zotero 宿主能力的通道协议 JSON Schema，包含库条目引用、库快照请求/引用/标识与结构化诊断。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
