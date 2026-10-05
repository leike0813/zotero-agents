
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json

语言：json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json -->

定义 WebDAV 维护客户端协议的 JSON Schema，包含连接测试与诊断、冲突报告条目、同步状态、进度与上次运行记录。

规模：533 行
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](../../../src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [system.schema.json](system.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/system.schema.json | 定义 system 能力协议的 JSON Schema，包含握手请求/结果、健康检查、关闭请求、能力描述与仓库/计算池/传输快照。 |
