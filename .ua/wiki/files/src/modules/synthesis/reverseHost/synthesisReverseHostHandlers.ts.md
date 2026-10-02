
# src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/reverseHost](../../../../../modules/src/modules/synthesis/reverseHost.md)
<!-- node: file:src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts -->

Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。
源码：[src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts](../../../../../../../src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts)

## 符号（4）
<!-- node: function:src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:createDefaultSynthesisReverseHostHandlers -->
<!-- node: function:src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:createScopedSynthesisReverseHostHandlers -->
<!-- node: function:src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:createSynthesisReverseHostHandlers -->
<!-- node: function:src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:exactPayload -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createDefaultSynthesisReverseHostHandlers | 函数 | 465–510 | 中等 | factory、rpc-handler、依赖注入 | 0 | 按依赖装配出默认的 scoped handler 集合，作为 sidecar RPC 的实际入口。 |
| [createScopedSynthesisReverseHostHandlers](../../../../../symbols/src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts/createScopedSynthesisReverseHostHandlers.md) | 函数 | 295–463 | 复杂 | rpc-handler、scope、修订号、缓存 | 1 | 在基础 handler 上叠加 library scope 与库修订号缓存，阻止跨库读取与过期快照复用。 |
| [createSynthesisReverseHostHandlers](../../../../../symbols/src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts/createSynthesisReverseHostHandlers.md) | 函数 | 139–293 | 复杂 | rpc-handler、reverse-host、sidecar、核心 | 1 | 构造 reverse host 的基础 handler 集合，把 sidecar 回调分派到各 host port 并重建契约结果。 |
| exactPayload | 函数 | 120–137 | 简单 | 校验、rpc、契约 | 1 | 严格校验 RPC 载荷字段：要求必填字段存在且不含未声明字段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [exportDeliveryAdapter.ts](../exportDeliveryAdapter.ts.md) | src/modules/synthesis/exportDeliveryAdapter.ts | Synthesis 宿主导出与运行工作区物化 port 的实现：把 sidecar 侧请求落到运行时目录、注册 Host Bridge 文件句柄并返回可下载交付结果。 |
| [index.ts](../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [libraryAdapter.ts](../libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [relatedItemsEffectAdapter.ts](../relatedItemsEffectAdapter.ts.md) | src/modules/synthesis/relatedItemsEffectAdapter.ts | Synthesis related-items effect port 实现：依据 portable ref 解析 Zotero 条目并以追加方式写入关联关系，缺失条目转为诊断信息。 |
| [representativeImageReadAdapter.ts](../representativeImageReadAdapter.ts.md) | src/modules/synthesis/representativeImageReadAdapter.ts | Synthesis 代表图读取 port 实现：按 digest 描述符定位附件文件、读取字节并以 base64 形式回传，同时对不可用情形返回结构化诊断。 |
| [synthesisProductionRpcPolicy.ts](../production/synthesisProductionRpcPolicy.ts.md) | src/modules/synthesis/production/synthesisProductionRpcPolicy.ts | 生产客户端 RPC 策略层：以 contract-set 的 operations.json 为 SSOT，为每个 capability 解析请求/结果数据面、工作模型、receipt 形态与 deadline，避免在客户端各处硬编码超时。 |
| [synthesisReverseHostBroker.ts](synthesisReverseHostBroker.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts | 反向宿主 Broker：校验 sidecar 携带的 authorization token 与 service instance 绑定后，把 host-call 分派到对应 capability handler，并强制有界 deadline 与观测事件记录。 |
| [synthesisSidecarRpcClient.ts](../sidecar/synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |
| [synthesisSidecarTransferClient.ts](../sidecar/synthesisSidecarTransferClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts | sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。 |
| [tagEffectAdapter.ts](../tagEffectAdapter.ts.md) | src/modules/synthesis/tagEffectAdapter.ts | Synthesis 标签 effect port 实现：经 Broker 写入受审批的标签绑定，并支持 staged tag binding 的解析与迁移。 |
| [webDavSyncAdapter.ts](../webDavSyncAdapter.ts.md) | src/modules/synthesis/webDavSyncAdapter.ts | WebDAV 同步 port 实现：从插件首选项读取连接配置，经 HTTP client 发起 PROPFIND/PUT/MKCOL 请求并重建契约化的读写结果与远端描述。 |
| [zoteroHostCapabilityBroker.ts](../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [synthesisProductionOwner.ts](../production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [libraryAdapter.ts](../libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createDefaultSynthesisReverseHostHandlers | 函数 | 465–510 | 按依赖装配出默认的 scoped handler 集合，作为 sidecar RPC 的实际入口。 |
| [createScopedSynthesisReverseHostHandlers](../../../../../symbols/src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts/createScopedSynthesisReverseHostHandlers.md) | 函数 | 295–463 | 在基础 handler 上叠加 library scope 与库修订号缓存，阻止跨库读取与过期快照复用。 |
| [createSynthesisReverseHostHandlers](../../../../../symbols/src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts/createSynthesisReverseHostHandlers.md) | 函数 | 139–293 | 构造 reverse host 的基础 handler 集合，把 sidecar 回调分派到各 host port 并重建契约结果。 |
