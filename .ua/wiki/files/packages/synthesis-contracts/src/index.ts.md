
# packages/synthesis-contracts/src/index.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/index.ts -->

Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。
源码：[packages/synthesis-contracts/src/index.ts](../../../../../../packages/synthesis-contracts/src/index.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-production-route-performance.ts](../../../scripts/synthesis/check-synthesis-production-route-performance.ts.md) | scripts/synthesis/check-synthesis-production-route-performance.ts | 性能门禁脚本：经 Synthesis 生产路由执行 topic 数据集写入、标签效果与 maintenance 操作，采集延迟与降级信号并生成 P50/P95 性能报告。 |
| [clientPortAdapter.ts](../../../src/modules/synthesisClient/clientPortAdapter.ts.md) | src/modules/synthesisClient/clientPortAdapter.ts | Synthesis 客户端 Port 适配器：把抽象的 `SynthesisClientPort` 调用翻译为契约重建 + 受控执行，是 UI 与原生实现之间的统一入参校验与错误归一化边界。 |
| [defaultClient.ts](../../../src/modules/synthesisClient/defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [digestRepresentativeImage.ts](../../../src/modules/synthesis/digestRepresentativeImage.ts.md) | src/modules/synthesis/digestRepresentativeImage.ts | 从 digest managed note 的 HTML 中解析代表图描述符，并投影成 UI 所需的精简字段。 |
| [exportDeliveryAdapter.ts](../../../src/modules/synthesis/exportDeliveryAdapter.ts.md) | src/modules/synthesis/exportDeliveryAdapter.ts | Synthesis 宿主导出与运行工作区物化 port 的实现：把 sidecar 侧请求落到运行时目录、注册 Host Bridge 文件句柄并返回可下载交付结果。 |
| [healthGate.ts](../../../scripts/system-e2e/healthGate.ts.md) | scripts/system-e2e/healthGate.ts | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [hooks.ts](../../../src/hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeCapabilityRegistry.ts](../../../src/modules/hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCapabilityRoutes.ts](../../../src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeServer.ts](../../../src/modules/hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [itemObserver.ts](../../../src/modules/synthesis/itemObserver.ts.md) | src/modules/synthesis/itemObserver.ts | 监听 Zotero 条目与子笔记变更，识别文献评分等 managed note 变更并发出 Synthesis 读模型失效通知。 |
| [libraryAdapter.ts](../../../src/modules/synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [literatureArtifactMigration.ts](../../../src/modules/literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [nativeComposition.ts](../../../src/modules/synthesisClient/nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |
| [notePayloadCodec.ts](../../../src/modules/zoteroHost/notePayloadCodec.ts.md) | src/modules/zoteroHost/notePayloadCodec.ts | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |
| [relatedItemsEffectAdapter.ts](../../../src/modules/synthesis/relatedItemsEffectAdapter.ts.md) | src/modules/synthesis/relatedItemsEffectAdapter.ts | Synthesis related-items effect port 实现：依据 portable ref 解析 Zotero 条目并以追加方式写入关联关系，缺失条目转为诊断信息。 |
| [representativeImageReadAdapter.ts](../../../src/modules/synthesis/representativeImageReadAdapter.ts.md) | src/modules/synthesis/representativeImageReadAdapter.ts | Synthesis 代表图读取 port 实现：按 digest 描述符定位附件文件、读取字节并以 base64 形式回传，同时对不可用情形返回结构化诊断。 |
| [researchBundleService.ts](../../../src/modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [runWorkspaceMaterializationAdapter.ts](../../../src/modules/synthesis/runWorkspaceMaterializationAdapter.ts.md) | src/modules/synthesis/runWorkspaceMaterializationAdapter.ts | 把 synthesis-contracts 定义的 run workspace 物化契约适配到插件侧运行时文件系统，使 Sidecar 下发的 workspace 结构在 Zotero 沙箱内按 runtimePersistence 规则落盘。 |
| [synthesisProductionOwner.ts](../../../src/modules/synthesis/production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisReadonlyPort.ts](../../../src/modules/harness/synthesisReadonlyPort.ts.md) | src/modules/harness/synthesisReadonlyPort.ts | Harness 只读 Synthesis Port 的核心实现：直接查询只读 SQLite，把 topic、concept、tag、review、citation graph 等工作台 Surface 投影为固定上限的内存结果，使 UI 能在无 sidecar 时渲染。 |
| [synthesisReverseHostBroker.ts](../../../src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts | 反向宿主 Broker：校验 sidecar 携带的 authorization token 与 service instance 绑定后，把 host-call 分派到对应 capability handler，并强制有界 deadline 与观测事件记录。 |
| [synthesisReverseHostEndpoint.ts](../../../src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts | 反向宿主 HTTP 端点：在 loopback 上自建最小 HTTP 服务器，解析 `/synthesis/v1/host-call` 请求并转交 broker 处置，同时提供无 socket 的纯函数请求处理入口。 |
| [synthesisReverseHostHandlers.ts](../../../src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |
| [synthesisSidecarControlClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarControlClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarControlClient.ts | sidecar 控制面客户端：读取 discovery、执行健康与握手探测并校验协议/能力/上限，分普通控制与生产控制两条 profile 支撑 Supervisor 生命周期判定。 |
| [synthesisSidecarRuntimeSupervisor.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [synthesisWorkbenchTab.ts](../../../src/modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [synthesisWorkbenchWireContract.ts](../../../src/shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |
| [tagEffectAdapter.ts](../../../src/modules/synthesis/tagEffectAdapter.ts.md) | src/modules/synthesis/tagEffectAdapter.ts | Synthesis 标签 effect port 实现：经 Broker 写入受审批的标签绑定，并支持 staged tag binding 的解析与迁移。 |
| [types.ts](../../../src/workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [ui-harness-serve.ts](../../../scripts/ui-harness-serve.ts.md) | scripts/ui-harness-serve.ts | UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。 |
| [uiModel.ts](../../../src/modules/synthesis/uiModel.ts.md) | src/modules/synthesis/uiModel.ts | Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。 |
| [webDavSyncAdapter.ts](../../../src/modules/synthesis/webDavSyncAdapter.ts.md) | src/modules/synthesis/webDavSyncAdapter.ts | WebDAV 同步 port 实现：从插件首选项读取连接配置，经 HTTP client 发起 PROPFIND/PUT/MKCOL 请求并重建契约化的读写结果与远端描述。 |
| [workbenchUiAdapter.ts](../../../src/modules/synthesisClient/workbenchUiAdapter.ts.md) | src/modules/synthesisClient/workbenchUiAdapter.ts | 工作台 UI 适配层：把客户端侧的 workbench 读取结果与图谱失败翻译为 UI 可直接消费的形态，包括图谱布局失败的分类、忙状态识别与 read state 构造。 |
| [workflowHostClient.ts](../../../src/modules/synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |
| [workflowHostOwners.ts](../../../src/workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowParameterOptions.ts](../../../src/modules/workflow/settings/workflowParameterOptions.ts.md) | src/modules/workflow/settings/workflowParameterOptions.ts | 工作流动态参数候选项的来源解析器，按参数声明的来源类型从 Synthesis sidecar 合约或 Zotero Host 能力 Broker 拉取可选值并附带诊断信息。 |
| [zoteroHostCapabilityBroker.ts](../../../src/modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostMutationAuthority.ts](../../../src/modules/zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |
| [zoteroItemRefAdapter.ts](../../../src/modules/synthesis/zoteroItemRefAdapter.ts.md) | src/modules/synthesis/zoteroItemRefAdapter.ts | portable item ref 与 Zotero 实体之间的双向适配：按 ref 查找条目并从条目生成稳定 ref。 |
| [zoteroManagedNotes.ts](../../../src/modules/zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |
| [zoteroMcpProtocol.ts](../../../src/modules/hostBridge/mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |
| [zoteroReadonlyLibraryAdapter.ts](../../../src/modules/harness/zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |
