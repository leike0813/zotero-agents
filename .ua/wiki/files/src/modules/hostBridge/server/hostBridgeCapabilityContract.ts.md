
# src/modules/hostBridge/server/hostBridgeCapabilityContract.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts -->

Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。
源码：[src/modules/hostBridge/server/hostBridgeCapabilityContract.ts](../../../../../../../src/modules/hostBridge/server/hostBridgeCapabilityContract.ts)

## 符号（13）
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:getHostBridgeCapabilityContract -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:listHostBridgeCapabilityContractEntries -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:propertySuggestions -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:validate -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:validateHostBridgeCapabilityInput -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:validateHostBridgeCapabilityOutput -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:validateHostBridgeMutationExecuteInput -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:validateHostBridgeMutationExecuteOutput -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:validateHostBridgeMutationGetOperationInput -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:validateHostBridgeMutationGetOperationOutput -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:validateHostBridgeMutationPreviewInput -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:validateHostBridgeMutationPreviewOutput -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:violationFromAjv -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getHostBridgeCapabilityContract | 函数 | 235–239 | 简单 | 合约、查询、capability | 0 | 按 capability 名称读取其合约条目。 |
| listHostBridgeCapabilityContractEntries | 函数 | 228–233 | 简单 | 枚举、合约、capability | 0 | 列出合约中全部 capability 条目及其标识。 |
| propertySuggestions | 函数 | 148–169 | 简单 | 错误提示、校验、工具函数 | 0 | 由 Ajv 报错中的属性名生成相近字段建议，降低 Agent 调参成本。 |
| validate | 函数 | 203–226 | 简单 | 校验、schema、合约 | 1 | 按 capability 合约校验数据，区分入参与出参并返回结构化问题。 |
| validateHostBridgeCapabilityInput | 函数 | 241–249 | 简单 | 校验、入参、capability | 0 | 校验 capability 入参是否符合合约。 |
| validateHostBridgeCapabilityOutput | 函数 | 251–259 | 简单 | 校验、出参、capability | 0 | 校验 capability 出参是否符合合约。 |
| validateHostBridgeMutationExecuteInput | 函数 | 261–267 | 简单 | 校验、mutation、host-bridge | 0 | 校验 canonical mutation execute 的入参。 |
| validateHostBridgeMutationExecuteOutput | 函数 | 269–275 | 简单 | 校验、mutation、host-bridge | 0 | 校验 canonical mutation execute 的出参。 |
| validateHostBridgeMutationGetOperationInput | 函数 | 293–299 | 简单 | 校验、mutation、host-bridge | 0 | 校验 mutation.get_operation 的入参。 |
| validateHostBridgeMutationGetOperationOutput | 函数 | 301–307 | 简单 | 校验、mutation、host-bridge | 0 | 校验 mutation.get_operation 的出参。 |
| validateHostBridgeMutationPreviewInput | 函数 | 277–283 | 简单 | 校验、mutation、host-bridge | 0 | 校验 canonical mutation preview 的入参。 |
| validateHostBridgeMutationPreviewOutput | 函数 | 285–291 | 简单 | 校验、mutation、host-bridge | 0 | 校验 canonical mutation preview 的出参。 |
| violationFromAjv | 函数 | 171–201 | 简单 | 错误映射、校验、schema | 0 | 把 Ajv 校验错误翻译为带 JSON 路径的 violation 对象。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [capabilities.v2.json](../../../../contracts/host-bridge/capabilities.v2.json.md) | contracts/host-bridge/capabilities.v2.json | Host Bridge v2 能力契约的单一事实源，以 5 万余行 JSON Schema 声明每项 Zotero 宿主能力的输入输出、mutation 语义与 note 详情结构。Rust 侧桥与插件侧校验器都从这份契约派生，保证 MCP/CLI 暴露面与 Zotero 宿主实现不漂移。 |
| [host-bridge-capabilities.v2.schema.json](../../../../contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json.md) | contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json | 定义 Host Bridge 可执行能力契约（capability contracts）v2 的 JSON Schema，约束每项能力的输入输出形状、mutation 语义与 note detail 输出结构，是 Broker 能力面与调用方之间的类型事实源。 |
| [hostBridgeProtocol.ts](hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [zoteroHostMutationSchemas.ts](../../../schemas/zoteroHostMutationSchemas.ts.md) | src/schemas/zoteroHostMutationSchemas.ts | Zotero 宿主变更的 JSON Schema 契约：定义 note detail、managed note 写入、文献产物 upsert 与各 mutation 操作的输入/预览/执行结果 schema 及其按操作索引的映射表。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityRegistry.ts](../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCapabilityRoutes.ts](routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeServer.ts](hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [render-host-mutation-contract.ts](../../../../scripts/host-bridge/render-host-mutation-contract.ts.md) | scripts/host-bridge/render-host-mutation-contract.ts | 构建期脚本，把 canonical mutation 的 JSON Schema 渲染成 Host Bridge agent-facing 契约文本，保证代理侧看到的 mutation 语义与插件侧 schema 同源。 |
| [zoteroMcpProtocol.ts](../mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-capabilities.v2.schema.json](../../../../contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json.md) | contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json | 定义 Host Bridge 可执行能力契约（capability contracts）v2 的 JSON Schema，约束每项能力的输入输出形状、mutation 语义与 note detail 输出结构，是 Broker 能力面与调用方之间的类型事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getHostBridgeCapabilityContract | 函数 | 235–239 | 按 capability 名称读取其合约条目。 |
| listHostBridgeCapabilityContractEntries | 函数 | 228–233 | 列出合约中全部 capability 条目及其标识。 |
| validateHostBridgeCapabilityInput | 函数 | 241–249 | 校验 capability 入参是否符合合约。 |
| validateHostBridgeCapabilityOutput | 函数 | 251–259 | 校验 capability 出参是否符合合约。 |
| validateHostBridgeMutationExecuteInput | 函数 | 261–267 | 校验 canonical mutation execute 的入参。 |
| validateHostBridgeMutationExecuteOutput | 函数 | 269–275 | 校验 canonical mutation execute 的出参。 |
| validateHostBridgeMutationGetOperationInput | 函数 | 293–299 | 校验 mutation.get_operation 的入参。 |
| validateHostBridgeMutationGetOperationOutput | 函数 | 301–307 | 校验 mutation.get_operation 的出参。 |
| validateHostBridgeMutationPreviewInput | 函数 | 277–283 | 校验 canonical mutation preview 的入参。 |
| validateHostBridgeMutationPreviewOutput | 函数 | 285–291 | 校验 canonical mutation preview 的出参。 |
