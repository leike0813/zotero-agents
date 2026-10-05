
# src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server/routes](../../../../../../modules/src/modules/hostBridge/server/routes.md)
<!-- node: file:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts -->

Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。
源码：[src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts](../../../../../../../../src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts)

## 符号（11）
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:buildCanonicalMutationApprovalPrompt -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:buildCapabilityApprovalPrompt -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:callCapability -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:capabilityAdmission -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:contextErrorResponse -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:getCurrentContext -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:getCurrentSelection -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:matchHostBridgeCapabilityRoute -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:methodNotAllowed -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:paginationErrorResponse -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts:permissionErrorResponse -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildCanonicalMutationApprovalPrompt | 函数 | 129–148 | 简单 | 审批提示、mutation、安全 | 0 | 为 canonical mutation 构造审批提示，列出 scope、kind 与语义摘要。 |
| buildCapabilityApprovalPrompt | 函数 | 150–227 | 复杂 | 审批提示、capability、安全 | 0 | 依据 capability 的审批需求构造面向用户的审批提示文本，写操作提示明确影响范围。 |
| callCapability | 函数 | 319–624 | 复杂 | capability、执行、核心逻辑、审批 | 0 | 执行 capability 调用的完整链路：注册表解析、审批等待、Broker 调用、分页投影与错误映射。 |
| capabilityAdmission | 函数 | 229–248 | 简单 | admission、scope、路由 | 0 | 判定请求应走的 admission 类别并校验 scope，canonical mutation 单独归类。 |
| contextErrorResponse | 函数 | 250–291 | 中等 | 错误映射、上下文、host-bridge | 0 | 把上下文/选区读取失败映射为结构化错误响应。 |
| getCurrentContext | 函数 | 626–657 | 简单 | 上下文、broker、读取 | 0 | 读取 Zotero 当前上下文（活动窗口、选中集合与选区），失败时给出可诊断错误。 |
| getCurrentSelection | 函数 | 659–690 | 简单 | 选区、broker、分页 | 0 | 读取当前选区的精确分页事实并锁定有序 canonical facts。 |
| matchHostBridgeCapabilityRoute | 函数 | 692–715 | 简单 | 路由匹配、capability、host-bridge | 1 | 将请求路径与方法匹配到 capability 处理器，未匹配时返回空。 |
| methodNotAllowed | 函数 | 64–75 | 简单 | http、错误响应、路由 | 0 | 返回 405 响应并给出允许的方法列表。 |
| paginationErrorResponse | 函数 | 293–306 | 简单 | 分页、错误响应、host-bridge | 0 | 把分页入参或游标错误映射为响应，保留错误码供 Agent 修正。 |
| permissionErrorResponse | 函数 | 77–101 | 简单 | 权限、错误响应、审批 | 0 | 把权限拒绝映射为带审批回执入口的 403 响应。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityContract.ts](../hostBridgeCapabilityContract.ts.md) | src/modules/hostBridge/server/hostBridgeCapabilityContract.ts | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
| [hostBridgeCapabilityRegistry.ts](../../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgePagination.ts](../hostBridgePagination.ts.md) | src/modules/hostBridge/server/hostBridgePagination.ts | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [hostBridgePermissionManager.ts](../../permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [hostBridgeProtocol.ts](../hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [hostBridgeRouteContract.ts](../hostBridgeRouteContract.ts.md) | src/modules/hostBridge/server/hostBridgeRouteContract.ts | Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。 |
| [hostBridgeWriteAutoApprovalRegistry.ts](../../permissions/hostBridgeWriteAutoApprovalRegistry.ts.md) | src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts | Host Bridge 写操作的自动授权登记处：签发、吊销与按 run 回收 write auto-approval grant，并判定某个 scope 是否落在自动放权范围内。 |
| [hostHttpRequestReader.ts](../hostHttpRequestReader.ts.md) | src/modules/hostBridge/server/hostHttpRequestReader.ts | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |
| [index.ts](../../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [researchBundleService.ts](../../workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [types.ts](../../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostCapabilityBroker.ts](../../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroLibraryPageQuery.ts](../../../zoteroHost/zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeServer.ts](../hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| matchHostBridgeCapabilityRoute | 函数 | 692–715 | 将请求路径与方法匹配到 capability 处理器，未匹配时返回空。 |
