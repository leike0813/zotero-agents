
# src/modules/runtimeFileTransfer.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/runtimeFileTransfer.ts -->

跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。
源码：[src/modules/runtimeFileTransfer.ts](../../../../../src/modules/runtimeFileTransfer.ts)

## 符号（9）
<!-- node: function:src/modules/runtimeFileTransfer.ts:acquireTransferSlot -->
<!-- node: function:src/modules/runtimeFileTransfer.ts:beginRuntimeFileResponseTransfer -->
<!-- node: function:src/modules/runtimeFileTransfer.ts:beginXpcFileCopy -->
<!-- node: function:src/modules/runtimeFileTransfer.ts:digestRuntimeFileSource -->
<!-- node: function:src/modules/runtimeFileTransfer.ts:inspectRuntimeFileSource -->
<!-- node: function:src/modules/runtimeFileTransfer.ts:readRuntimeFileChunks -->
<!-- node: function:src/modules/runtimeFileTransfer.ts:readXpcFileChunks -->
<!-- node: class:src/modules/runtimeFileTransfer.ts:RuntimeFileTransferError -->
<!-- node: function:src/modules/runtimeFileTransfer.ts:verifyRuntimeFileSource -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acquireTransferSlot | 函数 | 74–88 | 简单 | 并发控制、文件传输、utility | 1 | 获取全局唯一的文件传输槽，保证同一时刻只有一个读盘传输在执行。 |
| beginRuntimeFileResponseTransfer | 函数 | 549–577 | 中等 | 文件传输、运行时适配、入口点 | 1 | 文件响应传输的公共入口：按运行时选择拷贝实现并返回完成 Promise 与中止句柄。 |
| [beginXpcFileCopy](../../../symbols/src/modules/runtimeFileTransfer.ts/beginXpcFileCopy.md) | 函数 | 420–521 | 复杂 | 文件传输、xpc、并发控制 | 1 | 在 XPC 运行时下启动异步文件拷贝：占用传输槽、分块读取并在写入失败时释放资源。 |
| [digestRuntimeFileSource](../../../symbols/src/modules/runtimeFileTransfer.ts/digestRuntimeFileSource.md) | 函数 | 340–361 | 中等 | sha256、文件传输、流式 | 2 | 流式计算文件源的字节数与 SHA-256 摘要，用于传输一致性验证。 |
| inspectRuntimeFileSource | 函数 | 309–338 | 中等 | 文件传输、预检、校验 | 0 | 检查文件源事实：返回大小并标记是否需要在传输期间做摘要校验。 |
| readRuntimeFileChunks | 函数 | 287–307 | 简单 | 文件传输、运行时适配、分派 | 0 | 按运行时能力选择 XPC 或 Node 兼容实现来分块读取文件。 |
| readXpcFileChunks | 函数 | 172–285 | 复杂 | 文件传输、xpc、分块 | 0 | 通过 Zotero XPC 文件接口分块读取文件内容并回调每个分块，是插件沙箱下的主读取路径。 |
| RuntimeFileTransferError | 类 | 20–38 | 简单 | error-type、文件传输、契约 | 0 | 文件传输层错误类型，用受限错误码区分文件不可用、传输期间变更与传输失败。 |
| verifyRuntimeFileSource | 函数 | 363–394 | 中等 | 校验、sha256、错误处理 | 0 | 把实测摘要与预期摘要比对，不一致时以 runtime_file_changed 失败以中止传输。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunInteractionFiles.ts](acp/skillRun/acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [archive.ts](../workflows/archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [hostBridgeFileRegistry.ts](hostBridge/server/hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [hostBridgeServer.ts](hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeWorkflowResources.ts](hostBridge/workflow/hostBridgeWorkflowResources.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts | Host Bridge 工作流资源层：管理一次运行期间的输入输出槽位绑定、文件登记与物化，为工作流提供受约束的读写资源 API。 |
| [researchBundleService.ts](hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [runtimeHttpResponse.ts](hostBridge/server/runtimeHttpResponse.ts.md) | src/modules/hostBridge/server/runtimeHttpResponse.ts | Host Bridge HTTP 响应构造层：把 JSON、文本、空响应与文件响应统一准备成可直接写入 Zotero 输出流的字节载荷，并在内存拷贝与异步文件传输之间做统一的分块、超时与失败清理。 |
| [skillRunnerRunDialog.ts](skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [workflowInputMaterialization.ts](../workflows/workflowInputMaterialization.ts.md) | src/workflows/workflowInputMaterialization.ts | 工作流输入物化：把声明的输入文件复制到受管工作区，规范化并去重文件名，拒绝 Windows 保留设备名，然后返回可供后续处理的可信路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| beginRuntimeFileResponseTransfer | 函数 | 549–577 | 文件响应传输的公共入口：按运行时选择拷贝实现并返回完成 Promise 与中止句柄。 |
| [digestRuntimeFileSource](../../../symbols/src/modules/runtimeFileTransfer.ts/digestRuntimeFileSource.md) | 函数 | 340–361 | 流式计算文件源的字节数与 SHA-256 摘要，用于传输一致性验证。 |
| inspectRuntimeFileSource | 函数 | 309–338 | 检查文件源事实：返回大小并标记是否需要在传输期间做摘要校验。 |
| RuntimeFileTransferError | 类 | 20–38 | 文件传输层错误类型，用受限错误码区分文件不可用、传输期间变更与传输失败。 |
| verifyRuntimeFileSource | 函数 | 363–394 | 把实测摘要与预期摘要比对，不一致时以 runtime_file_changed 失败以中止传输。 |
