
# contracts/host-bridge/schemas
> 目录聚合页：15 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [contracts/host-bridge/schemas/host-bridge-argument-error.v1.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge-argument-error.v1.schema.json.md) | 配置 | 0 | 定义 Host Bridge 结构化参数错误的 JSON Schema v1 契约，规定错误码、消息、失败参数路径与重试提示等字段形态，供 CLI/MCP 面向上报可判读的 argument 错误。 |
| [contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json.md) | 配置 | 0 | 定义 Host Bridge 可执行能力契约（capability contracts）v2 的 JSON Schema，约束每项能力的输入输出形状、mutation 语义与 note detail 输出结构，是 Broker 能力面与调用方之间的类型事实源。 |
| [contracts/host-bridge/schemas/host-bridge-cli-command-contracts.v2.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge-cli-command-contracts.v2.schema.json.md) | 配置 | 0 | 定义 Zotero Bridge CLI 可执行命令契约 v2 的 JSON Schema，逐命令规定参数、退出码与结构化输出 envelope，是 CLI 面向代理发布的接口形状来源。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v2.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v2.schema.json.md) | 配置 | 0 | Host Bridge Agent Surface v2 的 JSON Schema，描述向 Agent 暴露的 MCP 工具、参数与响应面，是 agent-facing surface 的早期版本基线。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v3.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v3.schema.json.md) | 配置 | 0 | Host Bridge Agent Surface v3 的 JSON Schema，扩展 v2 的工具面与响应结构，反映 Broker 能力暴露方式的演进。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v4.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v4.schema.json.md) | 配置 | 0 | Zotero Bridge Agent Surface v4 的 JSON Schema，定义该版本 Agent 可见的工具清单、输入 schema 与语义化指令文本面。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v5.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v5.schema.json.md) | 配置 | 0 | Zotero Bridge Agent Surface v5 的 JSON Schema，扩充工具与参数面并引入更细的语义约束，是当前较新一版 agent-facing 契约。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v6.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v6.schema.json.md) | 配置 | 0 | Zotero Bridge Agent Surface v6 的 JSON Schema，本批中规模最大的 agent 面契约，覆盖最新工具集合、参数校验与响应 envelope。 |
| [contracts/host-bridge/schemas/host-bridge.release-receipt.v1.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.release-receipt.v1.schema.json.md) | 配置 | 0 | Host Bridge 发布回执（release receipt）v1 的 JSON Schema，规定一次受治理发布产出的身份、版本与证据字段。 |
| [contracts/host-bridge/schemas/host-bridge.release-receipt.v2.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.release-receipt.v2.schema.json.md) | 配置 | 0 | Host Bridge 发布回执 v2 的 JSON Schema，在 v1 基础上补充发布证据链与目标平台信息，供 release 身份校验使用。 |
| [contracts/host-bridge/schemas/host-bridge.release-set.v1.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.release-set.v1.schema.json.md) | 配置 | 0 | Host Bridge 发布集合（release set）v1 的 JSON Schema，描述一次发布中各平台二进制与身份文件的集合结构。 |
| [contracts/host-bridge/schemas/host-bridge.release-set.v2.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.release-set.v2.schema.json.md) | 配置 | 0 | Host Bridge 发布集合 v2 的 JSON Schema，扩展集合条目以携带校验摘要与目标平台标识。 |
| [contracts/host-bridge/schemas/host-bridge.release-set.v3.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.release-set.v3.schema.json.md) | 配置 | 0 | Host Bridge 发布集合 v3 的 JSON Schema，引入按平台分组的条目布局与更严格的必填字段约束。 |
| [contracts/host-bridge/schemas/host-bridge.release-set.v4.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.release-set.v4.schema.json.md) | 配置 | 0 | Host Bridge 发布集合 v4 的 JSON Schema，为当前最新的发布集合契约，规定多平台产物、身份文件与回执的组合关系。 |
| [contracts/host-bridge/schemas/host-bridge.semantic-guidance.v2.schema.json](../../../files/contracts/host-bridge/schemas/host-bridge.semantic-guidance.v2.schema.json.md) | 配置 | 0 | Host Bridge 语义指导（semantic guidance）v2 的 manifest JSON Schema，约束面向代理发布的语义说明条目结构，保证 agent-facing 指令文本可校验。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [scripts/host-bridge](../../scripts/host-bridge.md) | 21 |
| [rust/zotero-bridge/src](../../rust/zotero-bridge/src.md) | 3 |
| [src/modules/hostBridge/server](../../src/modules/hostBridge/server.md) | 1 |
| [src/shared](../../src/shared.md) | 1 |
