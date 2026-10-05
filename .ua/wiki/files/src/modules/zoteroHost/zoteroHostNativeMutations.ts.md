
# src/modules/zoteroHost/zoteroHostNativeMutations.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/zoteroHost](../../../../modules/src/modules/zoteroHost.md)
<!-- node: file:src/modules/zoteroHost/zoteroHostNativeMutations.ts -->

Zotero 宿主原生 mutation 执行层：把已审批的写操作落到原生 transaction 与 Zotero API，覆盖元数据创建、附件写入等 canonical mutation 路径。
源码：[src/modules/zoteroHost/zoteroHostNativeMutations.ts](../../../../../../src/modules/zoteroHost/zoteroHostNativeMutations.ts)

## 符号（8）
<!-- node: function:src/modules/zoteroHost/zoteroHostNativeMutations.ts:assertReplacementJournal -->
<!-- node: function:src/modules/zoteroHost/zoteroHostNativeMutations.ts:createLinkedUrlAttachment -->
<!-- node: function:src/modules/zoteroHost/zoteroHostNativeMutations.ts:downloadStoredUrlToManagedStaging -->
<!-- node: function:src/modules/zoteroHost/zoteroHostNativeMutations.ts:importStoredAttachment -->
<!-- node: function:src/modules/zoteroHost/zoteroHostNativeMutations.ts:matchesStoredContentManifest -->
<!-- node: function:src/modules/zoteroHost/zoteroHostNativeMutations.ts:recoverStoredAttachmentReplacement -->
<!-- node: function:src/modules/zoteroHost/zoteroHostNativeMutations.ts:recoverStoredAttachmentReplacements -->
<!-- node: function:src/modules/zoteroHost/zoteroHostNativeMutations.ts:replaceStoredAttachmentOnce -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertReplacementJournal | 函数 | 104–157 | 中等 | zotero 宿主、事务、校验 | 0 | 校验 stored attachment 替换日志的阶段与文件事实，确保崩溃恢复有据可依。 |
| createLinkedUrlAttachment | 函数 | 359–388 | 中等 | zotero 宿主、attachment、链接附件 | 0 | 创建指向远程 URL 的链接型附件，不落地二进制内容。 |
| downloadStoredUrlToManagedStaging | 函数 | 298–357 | 中等 | zotero 宿主、下载、暂存区、安全 | 0 | 把远程 URL 下载到受管暂存区，校验尺寸与类型后才允许创建附件。 |
| importStoredAttachment | 函数 | 390–479 | 复杂 | zotero 宿主、附件导入、回滚 | 0 | 把已暂存文件导入为 stored attachment，失败时回滚新建对象并保留原始错误。 |
| matchesStoredContentManifest | 函数 | 229–272 | 中等 | zotero 宿主、内容比对、去重 | 0 | 比对已存附件内容与内容清单，判断是否可跳过重复下载。 |
| recoverStoredAttachmentReplacement | 函数 | 671–777 | 复杂 | 崩溃恢复、zotero 宿主、幂等 | 0 | 崩溃恢复：读取替换日志判定中断阶段，补齐或撤销半完成状态并记录 repair_required。 |
| recoverStoredAttachmentReplacements | 函数 | 779–787 | 简单 | 崩溃恢复、启动恢复、zotero 宿主 | 1 | 启动时扫描并恢复全部未终结的附件替换操作，返回恢复结果摘要。 |
| replaceStoredAttachmentOnce | 函数 | 492–669 | 复杂 | zotero 宿主、原生 mutation、事务、回滚 | 0 | 执行一次附件替换：写替换日志、准备新文件、在原生事务中提交并清理旧内容。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../platform/path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [path.ts](../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostPreparedFiles.ts](zoteroHostPreparedFiles.ts.md) | src/modules/zoteroHost/zoteroHostPreparedFiles.ts | 已准备文件的事实描述层：为受管附件的主文件与伴随文件计算相对路径、大小与 sha256 摘要，形成可被审批与重放校验的不可变快照。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| recoverStoredAttachmentReplacements | 函数 | 779–787 | 启动时扫描并恢复全部未终结的附件替换操作，返回恢复结果摘要。 |
