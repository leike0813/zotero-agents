
# src/modules/hostBridge/mcp/zoteroMcpProtocol.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/mcp](../../../../../modules/src/modules/hostBridge/mcp.md)
<!-- node: file:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts -->

Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。
源码：[src/modules/hostBridge/mcp/zoteroMcpProtocol.ts](../../../../../../../src/modules/hostBridge/mcp/zoteroMcpProtocol.ts)

## 符号（16）
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:buildMcpStatusSummary -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:buildNotePayloadDetailSummary -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:buildToolErrorResult -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:buildToolResult -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:callHostBridgeCapabilityAsMcpTool -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:formatAttachmentLine -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:formatItemRef -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:handleZoteroMcpJsonRpc -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:listHostBridgeMcpToolDefinitions -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:listZoteroMcpTools -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:mcpInputSchemaForCapability -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:normalizeRequest -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:requestCapabilityApprovalForMcp -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:summarizeHostBridgeCapabilityResult -->
<!-- node: function:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:validateAgainstSchema -->
<!-- node: class:src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:ZoteroMcpToolInputError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildMcpStatusSummary | 函数 | 791–824 | 中等 | 状态、格式化、mcp | 0 | 汇总 MCP 服务端状态：启用状态、连接模式、审批与后端信息，输出紧凑状态文本。 |
| buildNotePayloadDetailSummary | 函数 | 753–789 | 中等 | 格式化、note、mcp | 0 | 汇总单条 managed note 的 payload 明细，供 get_note_payload 工具输出。 |
| buildToolErrorResult | 函数 | 327–350 | 简单 | mcp、错误映射、host-bridge | 0 | 把内部错误映射为 MCP tool 错误结果，区分可重试与终态失败。 |
| buildToolResult | 函数 | 305–325 | 简单 | mcp、结果封装、host-bridge | 0 | 把 capability 结果包装为 MCP tool result，附带面向模型的紧凑文本与结构化内容。 |
| [callHostBridgeCapabilityAsMcpTool](../../../../../symbols/src/modules/hostBridge/mcp/zoteroMcpProtocol.ts/callHostBridgeCapabilityAsMcpTool.md) | 函数 | 1181–1296 | 复杂 | 调用、mcp、权限审批、capability | 1 | 以 MCP tool 形式调用 capability：参数校验、审批、执行、错误映射与结果压缩的完整链路。 |
| formatAttachmentLine | 函数 | 642–676 | 中等 | 格式化、附件、mcp | 0 | 把附件渲染为一行紧凑描述（标题、类型、大小、内容类型），控制上下文体积。 |
| formatItemRef | 函数 | 568–599 | 简单 | 格式化、引用、mcp | 0 | 把文献条目格式化为紧凑引用串，供 tool 输出的 next-call 提示复用。 |
| handleZoteroMcpJsonRpc | 函数 | 1309–1502 | 复杂 | 入口点、json-rpc、mcp | 0 | MCP JSON-RPC 总入口：解析方法、处理 tools/list 与 tools/call，并把内部异常统一映射为 JSON-RPC 错误。 |
| listHostBridgeMcpToolDefinitions | 函数 | 924–946 | 简单 | 工具定义、枚举、mcp | 1 | 枚举 Host Bridge 暴露的全部 MCP tool 定义及其描述与入参 schema。 |
| listZoteroMcpTools | 函数 | 1298–1307 | 简单 | mcp、工具定义、host-bridge | 0 | 处理 tools/list 请求，返回全部 tool 定义。 |
| mcpInputSchemaForCapability | 函数 | 909–922 | 简单 | schema、合约、mcp | 0 | 由 capability 合约推导出对应的 MCP tool 入参 schema。 |
| normalizeRequest | 函数 | 237–254 | 简单 | json-rpc、归一化、协议层 | 0 | 归一化 JSON-RPC 请求：校验 jsonrpc 版本、方法名与 id 形态，非法请求转为标准错误响应。 |
| requestCapabilityApprovalForMcp | 函数 | 1143–1179 | 中等 | 权限审批、agent-facing、mcp | 0 | 为写类 capability 发起权限审批请求，等待 Agent 侧授权决策后才执行。 |
| summarizeHostBridgeCapabilityResult | 函数 | 962–1141 | 复杂 | 结果投影、agent-facing、压缩 | 0 | 把各 capability 的原始结果投影为面向 Agent 的紧凑文本与关键字段，控制 token 消耗。 |
| validateAgainstSchema | 函数 | 400–520 | 复杂 | schema-校验、校验器、mcp | 0 | 轻量 JSON Schema 校验器：递归校验类型、必填、枚举与嵌套属性，产出带路径的错误列表。 |
| ZoteroMcpToolInputError | 类 | 210–218 | 简单 | 错误类型、mcp、入参校验 | 0 | MCP tool 入参非法时抛出的类型化错误，携带参数名与可读原因。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityContract.ts](../server/hostBridgeCapabilityContract.ts.md) | src/modules/hostBridge/server/hostBridgeCapabilityContract.ts | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
| [hostBridgeCapabilityRegistry.ts](../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgePagination.ts](../server/hostBridgePagination.ts.md) | src/modules/hostBridge/server/hostBridgePagination.ts | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [hostBridgeProtocol.ts](../server/hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [index.ts](../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [researchBundleService.ts](../workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostCapabilityBroker.ts](../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroLibraryPageQuery.ts](../../zoteroHost/zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](../../acp/transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpSkillRunExecutionSupport.ts](../../acp/skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [zoteroMcpServer.ts](zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| handleZoteroMcpJsonRpc | 函数 | 1309–1502 | MCP JSON-RPC 总入口：解析方法、处理 tools/list 与 tools/call，并把内部异常统一映射为 JSON-RPC 错误。 |
| listZoteroMcpTools | 函数 | 1298–1307 | 处理 tools/list 请求，返回全部 tool 定义。 |
| ZoteroMcpToolInputError | 类 | 210–218 | MCP tool 入参非法时抛出的类型化错误，携带参数名与可读原因。 |
