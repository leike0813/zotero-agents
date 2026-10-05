
# src/modules/hostBridge/server/hostBridgeFileRegistry.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgeFileRegistry.ts -->

Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。
源码：[src/modules/hostBridge/server/hostBridgeFileRegistry.ts](../../../../../../../src/modules/hostBridge/server/hostBridgeFileRegistry.ts)

## 符号（16）
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:acquireHostBridgeUploadedFileLease -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:getHostBridgeFileDescriptor -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:getHostBridgeFileDownloadManifest -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:hasHostBridgeUploadedFileLease -->
<!-- node: class:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:HostBridgeFileRegistryError -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:markHostBridgeUploadedFileConsumed -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:randomFragment -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:registerHostBridgeExportFile -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:registerHostBridgeFileHandle -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:registerHostBridgeUploadedFile -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:registerHostBridgeWorkflowArtifact -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:releaseHostBridgeUploadedFileLease -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:resolveHostBridgeFileDownload -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:resolveHostBridgeUploadedFile -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:sanitizeDisplayName -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeFileRegistry.ts:validateFileId -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acquireHostBridgeUploadedFileLease | 函数 | 439–500 | 中等 | 租约、并发、上传 | 0 | 为上传文件获取租约，已被其他 operation 独占时抛出冲突错误。 |
| getHostBridgeFileDescriptor | 函数 | 337–358 | 简单 | file-handle、查询、host-bridge | 0 | 按 ID 返回 file handle 描述符，已过期或被消费时返回空。 |
| getHostBridgeFileDownloadManifest | 函数 | 193–203 | 简单 | 下载、清单、file-handle | 0 | 返回指定 file handle 的下载清单（大小、类型、展示名）。 |
| hasHostBridgeUploadedFileLease | 函数 | 515–518 | 简单 | 租约、查询、host-bridge | 0 | 判断上传文件当前是否仍被某个 operation 持有租约。 |
| HostBridgeFileRegistryError | 类 | 88–108 | 简单 | 错误类型、文件注册、安全 | 0 | 文件登记或解析失败时抛出的类型化错误，区分非法 ID、租约冲突与已消费文件。 |
| markHostBridgeUploadedFileConsumed | 函数 | 431–437 | 简单 | 上传、幂等、状态 | 0 | 标记上传文件已被消费，阻止重复被不同 operation 使用。 |
| randomFragment | 函数 | 119–134 | 简单 | 随机数、路径、安全 | 0 | 生成随机路径片段，避免展示名参与实际存储路径。 |
| [registerHostBridgeExportFile](../../../../../symbols/src/modules/hostBridge/server/hostBridgeFileRegistry.ts/registerHostBridgeExportFile.md) | 函数 | 328–335 | 简单 | 导出、文件注册、host-bridge | 2 | 登记导出结果文件为 file handle。 |
| registerHostBridgeFileHandle | 函数 | 205–256 | 中等 | 文件注册、file-handle、host-bridge | 0 | 登记宿主文件句柄为可下载的 file handle，绑定校验摘要与生命周期。 |
| registerHostBridgeUploadedFile | 函数 | 268–307 | 中等 | 上传、文件注册、host-bridge | 0 | 登记 Agent 上传文件为 file handle，建立 staging 路径与初始租约。 |
| registerHostBridgeWorkflowArtifact | 函数 | 309–326 | 简单 | 工作流、文件注册、host-bridge | 0 | 登记工作流产物文件为 file handle。 |
| releaseHostBridgeUploadedFileLease | 函数 | 502–513 | 简单 | 租约、清理、上传 | 0 | 释放上传文件租约，引用归零时安排暂存文件清理。 |
| resolveHostBridgeFileDownload | 函数 | 360–415 | 中等 | 下载、校验、安全 | 0 | 解析下载请求为实际文件路径，校验租约与类型并拒绝越权读取。 |
| resolveHostBridgeUploadedFile | 函数 | 417–429 | 简单 | 上传、租约、解析 | 0 | 解析上传文件的暂存路径，仅在租约有效期内返回。 |
| sanitizeDisplayName | 函数 | 141–151 | 简单 | 文件名、脱敏、安全 | 0 | 清洗展示用文件名，去除控制字符与路径分隔符。 |
| validateFileId | 函数 | 181–191 | 简单 | 校验、file-handle、安全 | 0 | 校验 file handle ID 形态，拒绝可疑或超长 ID。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeFileTransfer.ts](../../runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [exportDeliveryAdapter.ts](../../synthesis/exportDeliveryAdapter.ts.md) | src/modules/synthesis/exportDeliveryAdapter.ts | Synthesis 宿主导出与运行工作区物化 port 的实现：把 sidecar 侧请求落到运行时目录、注册 Host Bridge 文件句柄并返回可下载交付结果。 |
| [hostBridgeCapabilityRegistry.ts](../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeFileRoutes.ts](routes/hostBridgeFileRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts | Host Bridge 文件路由：处理 Agent 的文件上传与下载，校验 file handle 租约、字节上限与内容类型，并把底层文件错误映射为统一响应。 |
| [hostBridgeServer.ts](hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeWorkflowAgentRun.ts](../workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [hostBridgeWorkflowControl.ts](../workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [hostBridgeWorkflowResources.ts](../workflow/hostBridgeWorkflowResources.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts | Host Bridge 工作流资源层：管理一次运行期间的输入输出槽位绑定、文件登记与物化，为工作流提供受约束的读写资源 API。 |
| [researchBundleService.ts](../workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| acquireHostBridgeUploadedFileLease | 函数 | 439–500 | 为上传文件获取租约，已被其他 operation 独占时抛出冲突错误。 |
| getHostBridgeFileDescriptor | 函数 | 337–358 | 按 ID 返回 file handle 描述符，已过期或被消费时返回空。 |
| getHostBridgeFileDownloadManifest | 函数 | 193–203 | 返回指定 file handle 的下载清单（大小、类型、展示名）。 |
| hasHostBridgeUploadedFileLease | 函数 | 515–518 | 判断上传文件当前是否仍被某个 operation 持有租约。 |
| HostBridgeFileRegistryError | 类 | 88–108 | 文件登记或解析失败时抛出的类型化错误，区分非法 ID、租约冲突与已消费文件。 |
| markHostBridgeUploadedFileConsumed | 函数 | 431–437 | 标记上传文件已被消费，阻止重复被不同 operation 使用。 |
| [registerHostBridgeExportFile](../../../../../symbols/src/modules/hostBridge/server/hostBridgeFileRegistry.ts/registerHostBridgeExportFile.md) | 函数 | 328–335 | 登记导出结果文件为 file handle。 |
| registerHostBridgeFileHandle | 函数 | 205–256 | 登记宿主文件句柄为可下载的 file handle，绑定校验摘要与生命周期。 |
| registerHostBridgeUploadedFile | 函数 | 268–307 | 登记 Agent 上传文件为 file handle，建立 staging 路径与初始租约。 |
| registerHostBridgeWorkflowArtifact | 函数 | 309–326 | 登记工作流产物文件为 file handle。 |
| releaseHostBridgeUploadedFileLease | 函数 | 502–513 | 释放上传文件租约，引用归零时安排暂存文件清理。 |
| resolveHostBridgeFileDownload | 函数 | 360–415 | 解析下载请求为实际文件路径，校验租约与类型并拒绝越权读取。 |
| resolveHostBridgeUploadedFile | 函数 | 417–429 | 解析上传文件的暂存路径，仅在租约有效期内返回。 |
