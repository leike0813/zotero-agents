
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json

语言：json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json -->

定义 sidecar 生命周期协议的 JSON Schema，包含启动配置 v4、发现文档 v2/生产发现 v5、平台签名与反向宿主描述。

规模：207 行
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](../../../src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [reverse-host.schema.json](reverse-host.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json | 定义 sidecar 反向调用 Zotero 宿主能力的通道协议 JSON Schema，包含库条目引用、库快照请求/引用/标识与结构化诊断。 |
| [runtime-bundle.schema.json](runtime-bundle.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/runtime-bundle.schema.json | 定义运行时 bundle 协议的 JSON Schema，描述 bundle v3、指针 v2、相对路径文件条目与来源证明（Provenance）。 |
