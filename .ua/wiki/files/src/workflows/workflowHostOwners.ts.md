
# src/workflows/workflowHostOwners.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/workflowHostOwners.ts -->

Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。

规模：1453 行
源码：[src/workflows/workflowHostOwners.ts](../../../../../src/workflows/workflowHostOwners.ts)

## 符号（23）
<!-- node: function:src/workflows/workflowHostOwners.ts:canonicalAttachmentMetadata -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createBoundWorkflowResearchBundleApi -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createCanonicalStoredAttachmentSource -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createStoredAttachmentCompleteSemanticInput -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createStoredAttachmentNonResourceSemanticInput -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createWorkflowAddonOwner -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createWorkflowEnvironmentOwner -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createWorkflowHostCapabilityBroker -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createWorkflowHostLeafScope -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createWorkflowHostLiveReadAdapters -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createWorkflowLibraryItemSnapshotApi -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createWorkflowPreparedStoredFiles -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createWorkflowResearchBundleImportApi -->
<!-- node: function:src/workflows/workflowHostOwners.ts:createWorkflowResearchBundleMaterializeApi -->
<!-- node: function:src/workflows/workflowHostOwners.ts:isAttachmentCreateMutationResult -->
<!-- node: function:src/workflows/workflowHostOwners.ts:isAttachmentDetail -->
<!-- node: function:src/workflows/workflowHostOwners.ts:isAttachmentReplaceMutationResult -->
<!-- node: function:src/workflows/workflowHostOwners.ts:lookupWorkflowStoredAttachmentMutation -->
<!-- node: function:src/workflows/workflowHostOwners.ts:requireConfirmedMutationResult -->
<!-- node: function:src/workflows/workflowHostOwners.ts:requireMutationItemRef -->
<!-- node: function:src/workflows/workflowHostOwners.ts:researchImportEffectOperationId -->
<!-- node: function:src/workflows/workflowHostOwners.ts:withWorkflowHostLeafScope -->
<!-- node: function:src/workflows/workflowHostOwners.ts:withWorkflowLibraryItemSnapshot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| canonicalAttachmentMetadata | 函数 | 148–163 | 简单 | attachment、canonical、normalization | 0 | 把附件元数据规范化为 canonical 形式，剥离不稳定字段。 |
| createBoundWorkflowResearchBundleApi | 函数 | 1314–1336 | 简单 | research-bundle、composition、factory、exported | 0 | 把导入与物化 API 绑定为单一可注入的组合。 |
| createCanonicalStoredAttachmentSource | 函数 | 165–195 | 简单 | attachment、source、factory、exported | 0 | 创建已存附件来源描述，绑定路径校验与摘要。 |
| createStoredAttachmentCompleteSemanticInput | 函数 | 221–251 | 简单 | attachment、semantics、factory、exported | 0 | 构造包含全部字段的附件完整语义输入。 |
| createStoredAttachmentNonResourceSemanticInput | 函数 | 197–219 | 简单 | attachment、semantics、hash、exported | 0 | 构造忽略资源型字段的附件语义输入，供变更摘要使用。 |
| createWorkflowAddonOwner | 函数 | 1411–1422 | 简单 | owner、addon、factory、exported | 0 | 创建 addon owner，暴露插件版本与基础信息。 |
| createWorkflowEnvironmentOwner | 函数 | 1424–1443 | 简单 | owner、environment、factory、exported | 0 | 创建环境 owner，暴露宿主版本与能力探测结果。 |
| createWorkflowHostCapabilityBroker | 函数 | 309–313 | 简单 | broker、projection、factory、exported | 0 | 投影 Broker 能力为工作流可见的只读与受控变更接口。 |
| createWorkflowHostLeafScope | 函数 | 367–411 | 简单 | scope、factory、workflow、exported | 0 | 创建工作流叶子作用域，绑定本次调用的运行身份。 |
| createWorkflowHostLiveReadAdapters | 函数 | 425–470 | 简单 | adapter、read、projection、exported | 0 | 把 Broker 的实时读能力适配为工作流可用接口。 |
| createWorkflowLibraryItemSnapshotApi | 函数 | 1338–1401 | 中等 | snapshot、projection、factory、exported | 0 | 创建库条目快照 API，投影只读快照能力。 |
| createWorkflowPreparedStoredFiles | 函数 | 315–365 | 中等 | prepared-files、projection、factory、exported | 0 | 投影 prepared files 能力到工作流侧。 |
| createWorkflowResearchBundleImportApi | 函数 | 547–1088 | 复杂 | research-bundle、factory、import、exported | 0 | 创建 research bundle 导入 API。 |
| createWorkflowResearchBundleMaterializeApi | 函数 | 1090–1312 | 复杂 | research-bundle、factory、materialization、exported | 0 | 创建 research bundle 物化 API，负责把包落到受管目录。 |
| isAttachmentCreateMutationResult | 函数 | 291–295 | 简单 | attachment、type-guard、mutation、exported | 0 | 判定附件变更结果是否为创建形态。 |
| isAttachmentDetail | 函数 | 277–289 | 简单 | attachment、type-guard、utility | 0 | 判定结果 DTO 是否为附件详情形态。 |
| isAttachmentReplaceMutationResult | 函数 | 297–307 | 简单 | attachment、type-guard、mutation、exported | 0 | 判定附件变更结果是否为替换形态。 |
| lookupWorkflowStoredAttachmentMutation | 函数 | 253–275 | 简单 | attachment、lookup、mutation、exported | 0 | 按操作 ID 查找工作流侧已提交的附件变更。 |
| requireConfirmedMutationResult | 函数 | 486–504 | 简单 | validation、mutation、result | 0 | 校验变更结果处于确认态，否则视为不可用。 |
| requireMutationItemRef | 函数 | 523–538 | 简单 | mutation、validation、ref | 0 | 从变更结果中提取必需的条目引用。 |
| researchImportEffectOperationId | 函数 | 506–521 | 简单 | research-bundle、operation-id、derivation | 0 | 推导 research bundle 导入效果对应的操作 ID。 |
| withWorkflowHostLeafScope | 函数 | 413–423 | 简单 | scope、lifecycle、workflow、exported | 0 | 在给定叶子作用域内执行回调，结束后释放资源。 |
| withWorkflowLibraryItemSnapshot | 函数 | 1403–1409 | 简单 | snapshot、lifecycle、scope、exported | 0 | 在快照会话内执行回调，结束后自动释放快照资源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [archive.ts](archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [bibliography.ts](bibliography.ts.md) | src/workflows/bibliography.ts | 工作流参考文献渲染 owner：按 bibliography 格式调用 Zotero 内置 export translator 渲染书目，并规范化格式选项与 portable ref 输入。 |
| [clipboard.ts](clipboard.ts.md) | src/workflows/clipboard.ts | 工作流剪贴板 owner：优先解析 Gecko 剪贴板、次选 navigator.clipboard，并提供纯内存 adapter 作为降级实现，统一的读写限额与取消语义在此收敛。 |
| [feedbackSeam.ts](../modules/workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [file.ts](file.ts.md) | src/workflows/file.ts | 工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。 |
| [index.ts](../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [localizationGovernance.ts](../utils/localizationGovernance.ts.md) | src/utils/localizationGovernance.ts | 本地化治理层：canonicalize locale、按语言回退链取值、识别未解析的原始文案，并集中产出托管本地运行时与 SkillRunner 后端相关的 toast 文案。 |
| [notePayloadCodec.ts](../modules/zoteroHost/notePayloadCodec.ts.md) | src/modules/zoteroHost/notePayloadCodec.ts | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [researchBundleService.ts](../modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePlatform.ts](../platform/runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [sha256.ts](../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowEditorHost.ts](../modules/workflow/ui/workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |
| [workflowHostClient.ts](../modules/synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |
| [workflowHostContract.ts](workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [workflowLoggingOwner.ts](workflowLoggingOwner.ts.md) | src/workflows/workflowLoggingOwner.ts | 工作流日志 owner：绑定 workflowId/runId 等运行身份，把结构化日志请求校验为严格 JSON 并脱敏 token 与本机路径后写入 runtime log。 |
| [workflowNoteImagePreparation.ts](workflowNoteImagePreparation.ts.md) | src/workflows/workflowNoteImagePreparation.ts | 笔记图片准备：解码并校验 base64 图片、推断 MIME、按有界尺寸与 token 化引用生成 prepared image，供后续在原生事务中导入为笔记附件。 |
| [workflowStoredAttachmentImport.ts](workflowStoredAttachmentImport.ts.md) | src/workflows/workflowStoredAttachmentImport.ts | 已存附件的受管暂存：规范化伴随文件相对路径、拒绝越界与重复项，在创建 Zotero attachment 之前完成校验并返回带 cleanup 的暂存句柄。 |
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostMutationAuthority.ts](../modules/zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |
| [zoteroHostPreparedFiles.ts](../modules/zoteroHost/zoteroHostPreparedFiles.ts.md) | src/modules/zoteroHost/zoteroHostPreparedFiles.ts | 已准备文件的事实描述层：为受管附件的主文件与伴随文件计算相对路径、大小与 sha256 摘要，形成可被审批与重放校验的不可变快照。 |
| [zoteroManagedNotes.ts](../modules/zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [hostBridgeCapabilityRegistry.ts](../modules/hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createBoundWorkflowResearchBundleApi | 函数 | 1314–1336 | 把导入与物化 API 绑定为单一可注入的组合。 |
| createCanonicalStoredAttachmentSource | 函数 | 165–195 | 创建已存附件来源描述，绑定路径校验与摘要。 |
| createStoredAttachmentCompleteSemanticInput | 函数 | 221–251 | 构造包含全部字段的附件完整语义输入。 |
| createStoredAttachmentNonResourceSemanticInput | 函数 | 197–219 | 构造忽略资源型字段的附件语义输入，供变更摘要使用。 |
| createWorkflowAddonOwner | 函数 | 1411–1422 | 创建 addon owner，暴露插件版本与基础信息。 |
| createWorkflowEnvironmentOwner | 函数 | 1424–1443 | 创建环境 owner，暴露宿主版本与能力探测结果。 |
| createWorkflowHostCapabilityBroker | 函数 | 309–313 | 投影 Broker 能力为工作流可见的只读与受控变更接口。 |
| createWorkflowHostLeafScope | 函数 | 367–411 | 创建工作流叶子作用域，绑定本次调用的运行身份。 |
| createWorkflowHostLiveReadAdapters | 函数 | 425–470 | 把 Broker 的实时读能力适配为工作流可用接口。 |
| createWorkflowLibraryItemSnapshotApi | 函数 | 1338–1401 | 创建库条目快照 API，投影只读快照能力。 |
| createWorkflowPreparedStoredFiles | 函数 | 315–365 | 投影 prepared files 能力到工作流侧。 |
| createWorkflowResearchBundleImportApi | 函数 | 547–1088 | 创建 research bundle 导入 API。 |
| createWorkflowResearchBundleMaterializeApi | 函数 | 1090–1312 | 创建 research bundle 物化 API，负责把包落到受管目录。 |
| isAttachmentCreateMutationResult | 函数 | 291–295 | 判定附件变更结果是否为创建形态。 |
| isAttachmentReplaceMutationResult | 函数 | 297–307 | 判定附件变更结果是否为替换形态。 |
| lookupWorkflowStoredAttachmentMutation | 函数 | 253–275 | 按操作 ID 查找工作流侧已提交的附件变更。 |
| withWorkflowHostLeafScope | 函数 | 413–423 | 在给定叶子作用域内执行回调，结束后释放资源。 |
| withWorkflowLibraryItemSnapshot | 函数 | 1403–1409 | 在快照会话内执行回调，结束后自动释放快照资源。 |
