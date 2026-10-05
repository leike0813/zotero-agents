
# src/modules/hostBridgeCapabilityRegistry.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../layers/zotero-host.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/hostBridgeCapabilityRegistry.ts -->

Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。
源码：[src/modules/hostBridgeCapabilityRegistry.ts](../../../../../src/modules/hostBridgeCapabilityRegistry.ts)

## 符号（18）
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:applySynthesisOutputBoundary -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:bridgeLibraryItems -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:bridgeNavigation -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:callSynthesisDebugClient -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:debugStatus -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:debugZoteroEval -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:executeBridgeStoredAttachmentMutation -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:executeHostBridgeCapability -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:executeMutationWithBridgeProjection -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:exportWorkflowProduct -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:getHostBridgeCapability -->
<!-- node: class:src/modules/hostBridgeCapabilityRegistry.ts:HostBridgeCapabilityContractError -->
<!-- node: class:src/modules/hostBridgeCapabilityRegistry.ts:HostBridgeWorkflowProductError -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:invokeSynthesisClientCapability -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:normalizeHostBridgeCollectionRef -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:normalizeHostBridgeItemRef -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:paginateCapabilityRows -->
<!-- node: function:src/modules/hostBridgeCapabilityRegistry.ts:safeDebugEvalValue -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [applySynthesisOutputBoundary](../../../symbols/src/modules/hostBridgeCapabilityRegistry.ts/applySynthesisOutputBoundary.md) | 函数 | 1696–1855 | 复杂 | 输出边界、契约、synthesis、裁剪 | 1 | 对 Synthesis 能力的输入与输出做边界裁剪与分页归一，防止超出契约页大小限制。 |
| bridgeLibraryItems | 函数 | 590–620 | 中等 | broker、分页、能力实现 | 1 | 实现库条目列举能力：调用 Broker 精确分页并返回条目摘要与附件描述符。 |
| bridgeNavigation | 函数 | 548–588 | 中等 | broker、导航、能力实现 | 0 | 实现七项 navigation 能力，把请求分派到 Broker 并投影为 Bridge DTO。 |
| callSynthesisDebugClient | 函数 | 2490–2582 | 复杂 | debug、synthesis、诊断 | 0 | 为 debug 能力复用 SynthesisClient 调用路径，并附加调试模式的诊断包装。 |
| debugStatus | 函数 | 2143–2187 | 中等 | debug、状态快照、诊断 | 0 | 汇总调试状态快照：后端连接、运行中任务与宿主能力可用性。 |
| debugZoteroEval | 函数 | 2030–2107 | 复杂 | debug、错误处理、安全 | 0 | 在受限环境里执行调试表达式，捕获异常并对结果施加 JSON 体积上限。 |
| executeBridgeStoredAttachmentMutation | 函数 | 1115–1211 | 复杂 | mutation、附件导入、staging、审批 | 0 | 执行 stored attachment 导入的完整链路：预检、managed staging、审批后再准备并最终提交写入。 |
| [executeHostBridgeCapability](../../../symbols/src/modules/hostBridgeCapabilityRegistry.ts/executeHostBridgeCapability.md) | 函数 | 3020–3052 | 中等 | 能力注册、分派、host-bridge、入口点 | 2 | Host Bridge 能力统一执行入口：解析契约错误、查找 handler 并返回标准化的成功或失败响应。 |
| [executeMutationWithBridgeProjection](../../../symbols/src/modules/hostBridgeCapabilityRegistry.ts/executeMutationWithBridgeProjection.md) | 函数 | 764–815 | 中等 | mutation、canonical、投影 | 2 | 执行 canonical mutation 并把执行证据投影为 Bridge 的 operation 观察结果。 |
| exportWorkflowProduct | 函数 | 1492–1586 | 复杂 | 导出交付、工作流产品、路径校验 | 0 | 导出工作流产品包：校验资源路径不越界、注册导出文件句柄并返回下载清单。 |
| [getHostBridgeCapability](../../../symbols/src/modules/hostBridgeCapabilityRegistry.ts/getHostBridgeCapability.md) | 函数 | 2972–2990 | 简单 | 能力注册、查询、host-bridge | 3 | 按名称查询已注册能力的公开描述（名称、审批要求与 schema）。 |
| HostBridgeCapabilityContractError | 类 | 2998–3018 | 简单 | error-type、契约、host-bridge | 0 | 能力契约违例错误类型，用于未知能力名、输入不符合契约等场景。 |
| HostBridgeWorkflowProductError | 类 | 152–183 | 简单 | error-type、host-bridge、工作流产品 | 0 | 工作流产品（product）导出相关错误的类型，携带错误码与资源定位信息。 |
| [invokeSynthesisClientCapability](../../../symbols/src/modules/hostBridgeCapabilityRegistry.ts/invokeSynthesisClientCapability.md) | 函数 | 2307–2384 | 复杂 | synthesis、rpc-代理、契约 | 1 | 按能力名调用 SynthesisClient 方法，并对入参与结果做契约重建与边界裁剪。 |
| normalizeHostBridgeCollectionRef | 函数 | 380–443 | 中等 | 校验、portable-ref、host-bridge | 0 | 把外部传入的集合引用归一为内部 collection ref DTO，并支持按 key 解析的多种形态。 |
| normalizeHostBridgeItemRef | 函数 | 317–378 | 中等 | 校验、portable-ref、host-bridge | 1 | 把外部传入的条目引用归一为内部 item ref DTO，校验 libraryId 与 key 形态。 |
| paginateCapabilityRows | 函数 | 249–273 | 中等 | 分页、游标、host-bridge | 1 | 对已排序的能力结果行做游标分页，输出页内容与下一页游标。 |
| [safeDebugEvalValue](../../../symbols/src/modules/hostBridgeCapabilityRegistry.ts/safeDebugEvalValue.md) | 函数 | 1906–2003 | 复杂 | debug、脱敏、安全、投影 | 1 | 对 debug eval 结果做安全投影：限制深度、截断长字符串并抹除本地路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaultClient.ts](synthesisClient/defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [hostBridgeCapabilityContract.ts](hostBridge/server/hostBridgeCapabilityContract.ts.md) | src/modules/hostBridge/server/hostBridgeCapabilityContract.ts | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
| [hostBridgeFileRegistry.ts](hostBridge/server/hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [hostBridgeMutationAdapter.ts](hostBridge/server/hostBridgeMutationAdapter.ts.md) | src/modules/hostBridge/server/hostBridgeMutationAdapter.ts | canonical mutation 的适配层：把 Host Bridge 的 mutation 请求转成 ZoteroHostCapabilityBroker 的 canonical mutation 操作，并缓存 prepared 资源以复用文件与授权事实。 |
| [hostBridgePagination.ts](hostBridge/server/hostBridgePagination.ts.md) | src/modules/hostBridge/server/hostBridgePagination.ts | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [hostBridgePermissionManager.ts](hostBridge/permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [hostBridgeProtocol.ts](hostBridge/server/hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [index.ts](../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [researchBundleService.ts](hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePersistenceGovernance.ts](runtimePersistenceGovernance.ts.md) | src/modules/runtimePersistenceGovernance.ts | 运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。 |
| [types.ts](../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostOwners.ts](../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowProductStore.ts](workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [zipStore.ts](zipStore.ts.md) | src/modules/zipStore.ts | 纯前端 ZIP 写入器：用 TextEncoder、CRC32 表与 PNG 风格的分块编码把一组文本/字节条目打包成 ZIP 字节流，供工作流归档在无 Node 环境下使用。 |
| [zoteroHostCapabilityBroker.ts](zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostMutationAuthority.ts](zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |
| [zoteroLibraryPageQuery.ts](zoteroHost/zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityRoutes.ts](hostBridge/server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeServer.ts](hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeSynthesisRoutes.ts](hostBridge/server/routes/hostBridgeSynthesisRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts | Host Bridge Synthesis 路由：把 sidecar 的维护状态、缓存与索引状态暴露给 Agent，并支持经审批的缓存失效操作。 |
| [zoteroMcpProtocol.ts](hostBridge/mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [researchBundleService.ts](hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [executeHostBridgeCapability](../../../symbols/src/modules/hostBridgeCapabilityRegistry.ts/executeHostBridgeCapability.md) | 函数 | 3020–3052 | Host Bridge 能力统一执行入口：解析契约错误、查找 handler 并返回标准化的成功或失败响应。 |
| [getHostBridgeCapability](../../../symbols/src/modules/hostBridgeCapabilityRegistry.ts/getHostBridgeCapability.md) | 函数 | 2972–2990 | 按名称查询已注册能力的公开描述（名称、审批要求与 schema）。 |
| HostBridgeCapabilityContractError | 类 | 2998–3018 | 能力契约违例错误类型，用于未知能力名、输入不符合契约等场景。 |
| HostBridgeWorkflowProductError | 类 | 152–183 | 工作流产品（product）导出相关错误的类型，携带错误码与资源定位信息。 |
| normalizeHostBridgeCollectionRef | 函数 | 380–443 | 把外部传入的集合引用归一为内部 collection ref DTO，并支持按 key 解析的多种形态。 |
| normalizeHostBridgeItemRef | 函数 | 317–378 | 把外部传入的条目引用归一为内部 item ref DTO，校验 libraryId 与 key 形态。 |
