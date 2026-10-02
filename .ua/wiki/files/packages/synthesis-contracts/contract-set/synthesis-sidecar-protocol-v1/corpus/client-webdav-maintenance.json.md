
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-webdav-maintenance.json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-webdav-maintenance.json -->

WebDAV 与公共维护操作（maintenance）方向的协议语料，约束 webdav state 与 maintenance operation 的嵌套视图，并以负例锁定 diagnostic 开放字段与 scope row 结构。
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-webdav-maintenance.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-webdav-maintenance.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-webdav-maintenance.schema.json](../schemas/client-webdav-maintenance.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json | 定义 WebDAV 维护客户端协议的 JSON Schema，包含连接测试与诊断、冲突报告条目、同步状态、进度与上次运行记录。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.json](../registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
| [reverse-host.json](reverse-host.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json | 反向宿主（reverse-host）调用语料集，是本批唯一使用独立 schema 标识的语料文件，收录 10 个用例覆盖 related-items、tag effect、representative image、WebDAV description、artifact scan 与 delivery 等反向宿主结果形状。 |
