
# src/workflows/archive.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/archive.ts -->

工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。

规模：842 行
源码：[src/workflows/archive.ts](../../../../../src/workflows/archive.ts)

## 符号（14）
<!-- node: function:src/workflows/archive.ts:addMeasuredFile -->
<!-- node: function:src/workflows/archive.ts:assertWrittenMatchesMeasured -->
<!-- node: function:src/workflows/archive.ts:createWorkflowArchiveApi -->
<!-- node: function:src/workflows/archive.ts:extractInGecko -->
<!-- node: function:src/workflows/archive.ts:extractStoredZip -->
<!-- node: function:src/workflows/archive.ts:hashBytes -->
<!-- node: function:src/workflows/archive.ts:measureLocalFile -->
<!-- node: function:src/workflows/archive.ts:measureValidatedEntries -->
<!-- node: function:src/workflows/archive.ts:normalizeWorkflowArchiveEntryName -->
<!-- node: function:src/workflows/archive.ts:parseStoredZip -->
<!-- node: function:src/workflows/archive.ts:trackUniqueEntryName -->
<!-- node: function:src/workflows/archive.ts:validateEntries -->
<!-- node: function:src/workflows/archive.ts:writeStoredZipAtomic -->
<!-- node: function:src/workflows/archive.ts:writeZipInGecko -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| addMeasuredFile | 函数 | 357–372 | 简单 | archive、assembly、fact | 0 | 把已测量文件加入归档条目集合并保留其事实。 |
| assertWrittenMatchesMeasured | 函数 | 500–528 | 简单 | archive、validation、integrity | 0 | 校验落盘字节与预期条目事实一致。 |
| [createWorkflowArchiveApi](../../../symbols/src/workflows/archive.ts/createWorkflowArchiveApi.md) | 函数 | 682–842 | 中等 | factory、archive、api、exported | 2 | 创建工作流归档 API，绑定限额、持久化适配器与运行时探测。 |
| extractInGecko | 函数 | 627–680 | 中等 | archive、runtime、gecko | 0 | 优先使用 Gecko zip reader 运行时完成解包。 |
| extractStoredZip | 函数 | 611–625 | 简单 | archive、extraction、path-safety | 0 | 把 ZIP 条目原子解包到目标目录并防止路径穿越。 |
| hashBytes | 函数 | 334–344 | 简单 | hash、sha256、utility | 0 | 对字节序列计算 SHA-256 摘要。 |
| measureLocalFile | 函数 | 346–355 | 简单 | filesystem、measurement、sha256 | 0 | 读取本地文件的字节与摘要事实。 |
| measureValidatedEntries | 函数 | 374–400 | 简单 | archive、measurement、validation | 0 | 在写出前测量全部条目，形成可校验的预期摘要。 |
| normalizeWorkflowArchiveEntryName | 函数 | 224–261 | 简单 | path-safety、validation、archive | 0 | 规范化归档条目名，拒绝绝对路径、越界片段与保留设备名。 |
| parseStoredZip | 函数 | 545–609 | 中等 | archive、parsing、validation | 0 | 解析 ZIP 字节流，校验条目名与大小。 |
| trackUniqueEntryName | 函数 | 263–278 | 简单 | deduplication、validation、archive | 0 | 跟踪条目名并在冲突时拒绝归档。 |
| validateEntries | 函数 | 280–319 | 简单 | validation、archive、collection | 0 | 校验归档条目集合的非空、命名与类型约束。 |
| writeStoredZipAtomic | 函数 | 425–453 | 简单 | archive、atomicity、filesystem | 0 | 先写临时文件再原子替换完成 ZIP 落盘。 |
| writeZipInGecko | 函数 | 455–498 | 简单 | archive、runtime、gecko | 0 | 优先使用 Gecko zip writer 运行时写出归档。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeFileTransfer.ts](../modules/runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [zipStore.ts](../modules/zipStore.ts.md) | src/modules/zipStore.ts | 纯前端 ZIP 写入器：用 TextEncoder、CRC32 表与 PNG 风格的分块编码把一组文本/字节条目打包成 ZIP 字节流，供工作流归档在无 Node 环境下使用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [researchBundleService.ts](../modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [zipBundleReader.ts](zipBundleReader.ts.md) | src/workflows/zipBundleReader.ts | zip bundle 读取：解析工作流/内容包 zip 归档，校验条目路径安全后解出文件树，并配合泄漏探针清理解包临时目录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createWorkflowArchiveApi](../../../symbols/src/workflows/archive.ts/createWorkflowArchiveApi.md) | 函数 | 682–842 | 创建工作流归档 API，绑定限额、持久化适配器与运行时探测。 |
| normalizeWorkflowArchiveEntryName | 函数 | 224–261 | 规范化归档条目名，拒绝绝对路径、越界片段与保留设备名。 |
