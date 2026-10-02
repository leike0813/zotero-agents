
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/lifecycle.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/lifecycle.json -->

Sidecar 生命周期语料，含 8 个用例：reverse-host 嵌套投影、runtime provenance 的 path/hash 区分、sidecar error details 与 observation 事件结构，并以负例锁定 provenance 必须使用 path 而非 hash。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/lifecycle.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/lifecycle.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lifecycle.schema.json](../schemas/lifecycle.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json | 定义 sidecar 生命周期协议的 JSON Schema，包含启动配置 v4、发现文档 v2/生产发现 v5、平台签名与反向宿主描述。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
| [reverse-host.json](reverse-host.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json | 反向宿主（reverse-host）调用语料集，是本批唯一使用独立 schema 标识的语料文件，收录 10 个用例覆盖 related-items、tag effect、representative image、WebDAV description、artifact scan 与 delivery 等反向宿主结果形状。 |
